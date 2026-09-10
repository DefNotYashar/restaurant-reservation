import { db } from "@/lib/db";
import { conversationSessions, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { ReservationService } from "./reservation-service";

export type ConversationState =
  | "START"
  | "CREATE_RESERVATION"
  | "ASK_GUESTS"
  | "ASK_DATE"
  | "ASK_TIME"
  | "ASK_NAME"
  | "ASK_PHONE"
  | "CONFIRM"
  | "CANCEL_RESERVATION"
  | "CHECK_RESERVATION"
  | "CONTACT";

export interface ConversationData {
  partySize?: number;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  restaurantId?: string;
}

export class ConversationEngine {
  private reservationService = new ReservationService();

  async handleMessage(
    channel: "telegram" | "whatsapp",
    externalUserId: string,
    text: string,
    restaurantId?: string,
  ): Promise<{
    reply: string;
    keyboard?: any;
    nextState?: ConversationState;
  }> {
    const session = await this.getOrCreateSession(
      channel,
      externalUserId,
      restaurantId,
    );

    const currentState = session.state as ConversationState;

    await db.insert(messages).values({
      sessionId: session.id,
      channel,
      externalMessageId: String(Date.now()),
      direction: "INCOMING",
      text,
      type: "text",
    });

    // If user says yes / bale, start reservation
    if (text.toLowerCase().includes("bale") || text.toLowerCase().includes("yes")) {
      await db
        .update(conversationSessions)
        .set({
          state: "ASK_NAME",
          updatedAt: new Date(),
        })
        .where(eq(conversationSessions.id, session.id));
      return {
        reply: "عالی! نام خود را وارد کنید:",
        keyboard: null,
        nextState: "ASK_NAME",
      };
    }

    // Greeting / welcome when session starts or user first messages
    if (currentState === "START" || text.toLowerCase().includes("salam") || text.toLowerCase().includes("hello") || text.toLowerCase().includes("hi")) {
      return {
        reply: "Salam! 🌸 لطفاً رزرو کنید (bale / بله برای شروع)",
        keyboard: null,
        nextState: "START",
      };
    }

    if (text === "CREATE_RESERVATION") {
      await db
        .update(conversationSessions)
        .set({
          state: "ASK_NAME",
          updatedAt: new Date(),
        })
        .where(eq(conversationSessions.id, session.id));

      return {
        reply: "لطفاً نام خود را وارد کنید:",
        keyboard: null,
        nextState: "ASK_NAME",
      };
    }

    if (currentState === "ASK_NAME") {
      await this.updateDraft(session.id, { name: text.trim() });

      return {
        reply: "تعداد مهمانان چند نفر است؟ (مثلاً ۴)",
        keyboard: null,
        nextState: "ASK_GUESTS",
      };
    }

    if (currentState === "ASK_GUESTS") {
      const guests = parseInt(text, 10);
      if (guests >= 2 && guests <= 20) {
        await this.updateDraft(session.id, { partySize: guests });
        await db
          .update(conversationSessions)
          .set({ state: "ASK_DATE", updatedAt: new Date() })
          .where(eq(conversationSessions.id, session.id));
        return {
          reply: "چه روزی می‌خواهید رزرو کنید؟ (امروز یا فردا)",
          keyboard: null,
          nextState: "ASK_DATE",
        };
      }
      return {
        reply: "لطفاً تعداد مهمانان را با عدد صحیح وارد کنید (مثلاً ۴).",
        keyboard: null,
        nextState: "ASK_GUESTS",
      };
    }

    if (currentState === "ASK_DATE") {
      const dateText = text.trim().toLowerCase();
      if (dateText === "امروز" || dateText === "فردا" || dateText === "today" || dateText === "tomorrow" || dateText === "taday") {
        const dateValue = (dateText === "امروز" || dateText === "today") ? "today" : "tomorrow";
        await this.updateDraft(session.id, { date: dateValue });
        await db
          .update(conversationSessions)
          .set({ state: "ASK_TIME", updatedAt: new Date() })
          .where(eq(conversationSessions.id, session.id));
        return {
          reply: "ساعت رزرو را وارد کنید (مثلاً ۱۹:۰۰):",
          keyboard: null,
          nextState: "ASK_TIME",
        };
      }
      return {
        reply: "لطفاً امروor فردا (Today/Tomorrow) وارد کنید.",
        keyboard: null,
        nextState: "ASK_DATE",
      };
    }

    if (currentState === "ASK_TIME") {
      // Accept time format like 19:00, 20:30, etc.
      if (/^\d{1,2}:\d{2}$/.test(text.trim())) {
        await this.updateDraft(session.id, { time: text.trim() });
        return {
          reply: "reserv shoma anjam shod mamnun 🌸 - " + (session.draft?.name || "") + " - " + text.trim(),
          keyboard: this.buildMainKeyboard(),
          nextState: "CONFIRM",
        };
      }
      return {
        reply: "لطفاً ساعت را به فرمت ۱۹:۰۰ وارد کنید.",
        keyboard: null,
        nextState: "ASK_TIME",
      };
    }

    if (text === "CANCEL_RESERVATION") {
      await db
        .update(conversationSessions)
        .set({
          state: "CANCEL_RESERVATION",
          updatedAt: new Date(),
        })
        .where(eq(conversationSessions.id, session.id));

      return {
        reply: "لطفاً شماره رزرو خود را وارد کنید:",
      };
    }

    if (text === "MY_RESERVATIONS" || text === "رزرو من") {
      const list = await this.reservationService.findByCustomer(
        session.customerId || "",
      );

      if (list.length === 0) {
        return { reply: "رزوی برای شما ثبت نشده است." };
      }

      const lines = list
        .map((r) => `${r.code} · ${r.date} · ${r.time} · ${r.status}`)
        .join("\n");

      return {
        reply: `رزروهای شما:\n${lines}`,
      };
    }

    return {
      reply: "لطفاً یکی از گزینه‌ها را انتخاب کنید:",
      keyboard: this.buildMainKeyboard(),
    };
  }

  async getOrCreateSession(
    channel: string,
    externalUserId: string,
    restaurantId?: string,
  ): Promise<any> {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) =>
        and(
          eq(s.externalUserId, externalUserId),
          eq(s.channel, channel),
        ),
    });

    if (session) {
      return session;
    }

    const defaultRestaurant = await db.query.restaurants.findFirst({});

    const resolvedRestaurantId =
      restaurantId?.trim() || defaultRestaurant?.id;

    if (!resolvedRestaurantId) {
      throw new Error(
        "No restaurant configured for conversation session",
      );
    }

    const [newSession] = await db
      .insert(conversationSessions)
      .values({
        restaurantId: resolvedRestaurantId,
        channel,
        externalUserId,
        state: "START",
        draft: {},
      })
      .returning();

    return newSession;
  }

  async updateDraft(
    sessionId: string,
    draft: Partial<ConversationData>,
  ) {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) => eq(s.id, sessionId),
    });

    if (!session) {
      return;
    }

    const currentDraft = session.draft || {};
    const updatedDraft = { ...currentDraft, ...draft };

    await db
      .update(conversationSessions)
      .set({
        draft: updatedDraft,
        updatedAt: new Date(),
      })
      .where(eq(conversationSessions.id, sessionId));
  }

  buildMainKeyboard() {
    return {
      inline_keyboard: [
        [{ text: "رزرو میز", callback_data: "CREATE_RESERVATION" }],
        [{ text: "رزرو من", callback_data: "MY_RESERVATIONS" }],
        [{ text: "لغو رزرو", callback_data: "CANCEL_RESERVATION" }],
      ],
    };
  }

  buildGuestKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: "۲", callback_data: "2" },
          { text: "۳", callback_data: "3" },
          { text: "۴", callback_data: "4" },
        ],
        [
          { text: "۵", callback_data: "5" },
          { text: "۶", callback_data: "6" },
          { text: "۸", callback_data: "8" },
        ],
      ],
    };
  }

  buildDateKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: "امروز", callback_data: "TODAY" },
          { text: "فردا", callback_data: "TOMORROW" },
        ],
      ],
    };
  }
}
// rebuild trigger 1789075933
