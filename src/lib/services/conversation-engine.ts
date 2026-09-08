import { db } from "@/lib/db";
import { conversationSessions, messages, customers, reservations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
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
  ): Promise<{ reply: string; keyboard?: any; nextState?: ConversationState }> {
    const session = await this.getOrCreateSession(channel, externalUserId, restaurantId);
    const currentState = session.state as ConversationState;

    // Save incoming message
    await db.insert(messages).values({
      sessionId: session.id,
      channel,
      externalMessageId: String(Date.now()),
      direction: "INCOMING",
      text,
      type: "text",
    });

    // Parse number inputs in reservation flow
    if (currentState === "ASK_GUESTS" && !isNaN(Number(text))) {
      const guests = parseInt(text, 10);
      if (guests >= 2 && guests <= 20) {
        await this.updateDraft(session.id, { partySize: guests });
        return { reply: "چه روزی می‌خواهید رزرو کنید؟", keyboard: this.buildDateKeyboard(), nextState: "ASK_DATE" as ConversationState };
      }
      return { reply: "لطفاً تعداد مهمانان را با عدد صحیح وارد کنید (مثلاً ۴).", keyboard: this.buildGuestKeyboard() };
    }

    // Handle button callbacks
    if (text === "CREATE_RESERVATION") {
      await db.update(conversationSessions).set({ state: "CREATE_RESERVATION", updatedAt: new Date() }).where(eq(conversationSessions.id, session.id));
      return { reply: "تعداد مهمانان را انتخاب کنید:", keyboard: this.buildGuestKeyboard(), nextState: "ASK_GUESTS" as ConversationState };
    }

    if (text === "CANCEL_RESERVATION") {
      await db.update(conversationSessions).set({ state: "CANCEL_RESERVATION", updatedAt: new Date() }).where(eq(conversationSessions.id, session.id));
      return { reply: "لطفاً شماره رزرو خود را وارد کنید:", keyboard: undefined };
    }

    if (text === "MY_RESERVATIONS" || text === "رزرو من") {
      const list = await this.reservationService.findByCustomer(session.customerId || "");
      if (list.length === 0) return { reply: "رزوی برای شما ثبت نشده است." };
      const lines = list.map((r) => `${r.code} · ${r.date} · ${r.time} · ${r.status}`).join("\n");
      return { reply: `رزروهای شما:\n${lines}` };
    }

    return { reply: "لطفاً یکی از گزینه‌ها را انتخاب کنید:", keyboard: this.buildMainKeyboard() };
  }

  async getOrCreateSession(channel: string, externalUserId: string, restaurantId?: string): Promise<any> {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) => and(eq(s.externalUserId, externalUserId), eq(s.channel, channel)),
    });
    if (session) return session;

    const defaultRestaurant = await db.query.restaurants.findFirst({});
    const [newSession] = await db.insert(conversationSessions).values({
      restaurantId: restaurantId || defaultRestaurant?.id || "",
      channel,
      externalUserId,
      state: "START",
      draft: {},
    }).returning();
    return newSession;
  }

  async updateDraft(sessionId: string, draft: Partial<ConversationData>) {
    const session = await db.query.conversationSessions.findFirst({ where: (s) => eq(s.id, sessionId) });
    if (!session || !session.draft) return;
    const currentDraft = session.draft || {};
    const updatedDraft = { ...currentDraft, ...draft };
    await db.update(conversationSessions).set({ draft: updatedDraft, updatedAt: new Date() }).where(eq(conversationSessions.id, sessionId));
  }

  buildMainKeyboard() {
    return { inline_keyboard: [[{ text: "رزرو میز", callback_data: "CREATE_RESERVATION" }], [{ text: "رزرو من", callback_data: "MY_RESERVATIONS" }], [{ text: "لغو رزرو", callback_data: "CANCEL_RESERVATION" }]] };
  }

  buildGuestKeyboard() {
    return { inline_keyboard: [[{ text: "۲", callback_data: "2" }, { text: "۳", callback_data: "3" }, { text: "۴", callback_data: "4" }], [{ text: "۵", callback_data: "5" }, { text: "۶", callback_data: "6" }, { text: "۸", callback_data: "8" }]] };
  }

  buildDateKeyboard() {
    return { inline_keyboard: [[{ text: "امروز", callback_data: "TODAY" }, { text: "فردا", callback_data: "TOMORROW" }]] };
  }
}
