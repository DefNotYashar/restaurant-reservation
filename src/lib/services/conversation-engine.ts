import { db } from "@/lib/db";
import { conversationSessions, messages, customers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { ReservationService } from "./reservation-service";
import { AvailabilityService } from "./availability-service";

export type ConversationState =
  | "IDLE"
  | "ASK_NAME"
  | "ASK_PHONE"
  | "ASK_PARTY_SIZE"
  | "ASK_DATE"
  | "ASK_TIME"
  | "ASK_NOTES"
  | "VALIDATE"
  | "CREATE_RESERVATION"
  | "SUCCESS";

export interface ConversationData {
  name?: string;
  phone?: string;
  partySize?: number;
  date?: string;
  time?: string;
  notes?: string;
  restaurantId?: string;
}

function toEnglishNumerals(str: string): string {
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabic = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(persian[i], String(i));
    result = result.replaceAll(arabic[i], String(i));
  }
  return result;
}

function normalizeTime(input: string): string | null {
  const normalized = toEnglishNumerals(input.trim());
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function tehranDateString(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

function resolveDateLabel(input: string): string | null {
  const text = input.trim();
  if (text === "امروز") return tehranDateString(0);
  if (text === "فردا") return tehranDateString(1);
  return null;
}

function displayDate(realDate: string): string {
  if (realDate === tehranDateString(0)) return "امروز";
  if (realDate === tehranDateString(1)) return "فردا";
  return realDate;
}

export class ConversationEngine {
  private reservationService = new ReservationService();
  private availabilityService = new AvailabilityService();

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
    const draft = (session.draft as ConversationData) || {};

    await db.insert(messages).values({
      sessionId: session.id,
      channel,
      externalMessageId: String(Date.now()),
      direction: "INCOMING",
      text,
      type: "text",
    });

    const normalizedText = toEnglishNumerals(text.trim().toLowerCase());
    if (normalizedText === "/start" || normalizedText === "start") {
      await this.setState(session.id, "IDLE");
      await this.clearDraft(session.id);
      return {
        reply: "سلام، برای رزرو کلمه «رزرو» را تایپ کنید.",
        keyboard: null,
        nextState: "IDLE",
      };
    }

    if (currentState === "IDLE") {
      const normalized = toEnglishNumerals(text.trim());
      if (normalized === "رزرو") {
        await this.setState(session.id, "ASK_NAME");
        return {
          reply: "لطفاً نام خود را وارد کنید.",
          keyboard: null,
          nextState: "ASK_NAME",
        };
      }
      return {
        reply: "سلام، برای رزرو کلمه «رزرو» را تایپ کنید.",
        keyboard: null,
        nextState: "IDLE",
      };
    }

    if (currentState === "ASK_NAME") {
      const name = text.trim();
      if (!name) {
        return {
          reply: "لطفاً نام خود را وارد کنید.",
          keyboard: null,
          nextState: "ASK_NAME",
        };
      }
      await this.updateDraft(session.id, { name });
      await this.setState(session.id, "ASK_PHONE");
      return {
        reply: "شماره تلفن خود را وارد کنید.",
        keyboard: null,
        nextState: "ASK_PHONE",
      };
    }

    if (currentState === "ASK_PHONE") {
      const phone = text.trim();
      if (!phone) {
        return {
          reply: "لطفاً شماره تلفن خود را وارد کنید.",
          keyboard: null,
          nextState: "ASK_PHONE",
        };
      }
      await this.updateDraft(session.id, { phone });
      await this.setState(session.id, "ASK_PARTY_SIZE");
      return {
        reply: "چند نفر هستید؟",
        keyboard: null,
        nextState: "ASK_PARTY_SIZE",
      };
    }

    if (currentState === "ASK_PARTY_SIZE") {
      const normalized = toEnglishNumerals(text.trim());
      const partySize = parseInt(normalized, 10);
      if (isNaN(partySize) || partySize < 1 || partySize > 20) {
        return {
          reply: "لطفاً تعداد نفرات را به صورت عدد وارد کنید.",
          keyboard: null,
          nextState: "ASK_PARTY_SIZE",
        };
      }
      await this.updateDraft(session.id, { partySize });
      await this.setState(session.id, "ASK_DATE");
      return {
        reply: "برای امروز یا فردا؟",
        keyboard: null,
        nextState: "ASK_DATE",
      };
    }

    if (currentState === "ASK_DATE") {
      const date = resolveDateLabel(text);
      if (!date) {
        return {
          reply: "لطفاً «امروز» یا «فردا» را انتخاب کنید.",
          keyboard: null,
          nextState: "ASK_DATE",
        };
      }
      await this.updateDraft(session.id, { date });
      await this.setState(session.id, "ASK_TIME");
      const timeKeyboard = await this.buildTimeKeyboard(session.id, session.restaurantId || draft.restaurantId || restaurantId, date, draft.partySize);
      return {
        reply: "چه ساعتی؟",
        keyboard: timeKeyboard,
        nextState: "ASK_TIME",
      };
    }

    if (currentState === "ASK_TIME") {
      const cleanText = text.startsWith("TIME:") ? text.slice(5) : text;
      const time = normalizeTime(cleanText);
      if (!time) {
        return {
          reply: "لطفاً یک ساعت معتبر وارد کنید.",
          keyboard: null,
          nextState: "ASK_TIME",
        };
      }
      await this.updateDraft(session.id, { time });
      await this.setState(session.id, "ASK_NOTES");
      return {
        reply: "توضیح یا درخواست خاصی دارید؟ (اختیاری)",
        keyboard: { inline_keyboard: [[{ text: "خیر", callback_data: "SKIP_NOTES" }]] },
        nextState: "ASK_NOTES",
      };
    }

    if (currentState === "ASK_NOTES") {
      const cleanText = text.startsWith("SKIP_NOTES") ? "" : text.trim();
      const notes = cleanText || undefined;
      if (notes) {
        await this.updateDraft(session.id, { notes });
      }
      await this.setState(session.id, "VALIDATE");
      return this.processValidation(session.id, channel, externalUserId, restaurantId);
    }

    if (currentState === "VALIDATE") {
      return this.processValidation(session.id, channel, externalUserId, restaurantId);
    }

    if (currentState === "CREATE_RESERVATION") {
      return this.processCreateReservation(session.id, channel, externalUserId, restaurantId);
    }

    if (currentState === "SUCCESS") {
      await this.setState(session.id, "IDLE");
      await this.clearDraft(session.id);
      return {
        reply: "سلام، برای رزرو کلمه «رزرو» را تایپ کنید.",
        keyboard: null,
        nextState: "IDLE",
      };
    }

    return {
      reply: "سلام، برای رزرو کلمه «رزرو» را تایپ کنید.",
      keyboard: null,
      nextState: "IDLE",
    };
  }

  private async processValidation(
    sessionId: string,
    channel: "telegram" | "whatsapp",
    externalUserId: string,
    restaurantId?: string,
  ): Promise<{
    reply: string;
    keyboard?: any;
    nextState?: ConversationState;
  }> {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) => eq(s.id, sessionId),
    });
    if (!session) {
      return { reply: "خطا در جلسه. لطفاً دوباره امتحان کنید.", nextState: "IDLE" };
    }
    const draft = (session.draft as ConversationData) || {};
    const rid = draft.restaurantId || session.restaurantId || restaurantId;

    if (draft.date === "today" || draft.date === "tomorrow") {
      draft.date = draft.date === "today" ? tehranDateString(0) : tehranDateString(1);
      await this.updateDraft(sessionId, { date: draft.date });
    }

    if (!draft.name || !draft.partySize || !draft.date || !draft.time || !rid) {
      await this.setState(sessionId, "IDLE");
      return { reply: "اطلاعات ناقص است. لطفاً از ابتدا شروع کنید.", nextState: "IDLE" };
    }

    const available = await this.availabilityService.check({
      restaurantId: rid,
      date: draft.date,
      time: draft.time,
      partySize: draft.partySize,
    });

    if (available.status !== "AVAILABLE") {
      console.error("availability rejected:", {
        date: draft.date,
        time: draft.time,
        partySize: draft.partySize,
        reason: available.reason,
      });
      await this.setState(sessionId, "ASK_TIME");
      return {
        reply: "متأسفانه این ساعت خالی نیست. لطفاً ساعت دیگری انتخاب کنید.",
        keyboard: null,
        nextState: "ASK_TIME",
      };
    }

    await this.setState(sessionId, "CREATE_RESERVATION");
    return this.processCreateReservation(sessionId, channel, externalUserId, restaurantId);
  }

  private async processCreateReservation(
    sessionId: string,
    channel: "telegram" | "whatsapp",
    externalUserId: string,
    restaurantId?: string,
  ): Promise<{
    reply: string;
    keyboard?: any;
    nextState?: ConversationState;
  }> {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) => eq(s.id, sessionId),
    });
    if (!session) {
      return { reply: "خطا در جلسه. لطفاً دوباره امتحان کنید.", nextState: "IDLE" };
    }
    const draft = (session.draft as ConversationData) || {};
    const rid = draft.restaurantId || session.restaurantId || restaurantId;

    if (!draft.name || !draft.partySize || !draft.date || !draft.time || !rid) {
      return { reply: "اطلاعات ناقص است. لطفاً از ابتدا شروع کنید.", nextState: "IDLE" };
    }

    const customerId = await this.getOrCreateCustomer(channel, externalUserId, rid, draft.name);

    try {
      await this.reservationService.createReservation({
        restaurantId: rid,
        customerId,
        date: draft.date,
        time: draft.time,
        partySize: draft.partySize,
        notes: draft.notes,
        source: channel.toUpperCase() as any,
      });

      await this.setState(sessionId, "SUCCESS");

      const dateDisplay = displayDate(draft.date);
      return {
        reply: `رزرو شما برای ${dateDisplay} ساعت ${draft.time} برای ${draft.partySize} نفر به نام ${draft.name} ثبت شد.\n\nرزرو شد.`,
        keyboard: null,
        nextState: "SUCCESS",
      };
    } catch (err: any) {
      console.error("Reservation DB insert failed:", err?.message || err);
      return {
        reply: "متأسفانه در ثبت رزرو مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
        keyboard: null,
        nextState: "ASK_TIME",
      };
    }
  }

  private async setState(sessionId: string, state: ConversationState) {
    await db
      .update(conversationSessions)
      .set({ state, updatedAt: new Date() })
      .where(eq(conversationSessions.id, sessionId));
  }

  private async updateDraft(sessionId: string, draft: Partial<ConversationData>) {
    const session = await db.query.conversationSessions.findFirst({
      where: (s) => eq(s.id, sessionId),
    });
    if (!session) return;
    const currentDraft = (session.draft as ConversationData) || {};
    const updatedDraft = { ...currentDraft, ...draft };
    await db
      .update(conversationSessions)
      .set({ draft: updatedDraft, updatedAt: new Date() })
      .where(eq(conversationSessions.id, sessionId));
  }

  private async clearDraft(sessionId: string) {
    await db
      .update(conversationSessions)
      .set({ draft: {}, updatedAt: new Date() })
      .where(eq(conversationSessions.id, sessionId));
  }

  private async getOrCreateCustomer(
    channel: "telegram" | "whatsapp",
    externalUserId: string,
    restaurantId: string,
    name?: string,
  ): Promise<string> {
    const existing = await db.query.customers.findFirst({
      where: (c) =>
        and(
          eq(c.externalId, externalUserId),
          eq(c.channel, channel),
          eq(c.restaurantId, restaurantId),
        ),
    });

    if (existing) {
      if (name && existing.name !== name) {
        await db
          .update(customers)
          .set({ name, updatedAt: new Date() })
          .where(eq(customers.id, existing.id));
      }
      return existing.id;
    }

    const [newCustomer] = await db
      .insert(customers)
      .values({
        restaurantId,
        name: name || "مشتری",
        phone: externalUserId,
        externalId: externalUserId,
        channel,
      })
      .returning();

    return newCustomer.id;
  }

  private async getOrCreateSession(
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
    const resolvedRestaurantId = restaurantId?.trim() || defaultRestaurant?.id;

    if (!resolvedRestaurantId) {
      throw new Error("No restaurant configured for conversation session");
    }

    const [newSession] = await db
      .insert(conversationSessions)
      .values({
        restaurantId: resolvedRestaurantId,
        channel,
        externalUserId,
        state: "IDLE",
        draft: {},
      })
      .returning();

    return newSession;
  }

  private async buildTimeKeyboard(
    sessionId: string,
    restaurantId: string | undefined,
    date: string,
    partySize: number | undefined,
  ): Promise<any | null> {
    if (!restaurantId || !partySize) return null;
    try {
      const slots = await this.availabilityService.getAvailableSlots({
        restaurantId,
        date,
        time: "00:00",
        partySize,
      });
      const availableTimes = slots
        .filter((s) => s.available)
        .slice(0, 8)
        .map((s) => s.time);
      if (availableTimes.length === 0) return null;
      const rows = [];
      for (let i = 0; i < availableTimes.length; i += 2) {
        rows.push(availableTimes.slice(i, i + 2).map((t) => ({ text: t, callback_data: `TIME:${t}` })));
      }
      return { inline_keyboard: rows };
    } catch {
      return null;
    }
  }
}