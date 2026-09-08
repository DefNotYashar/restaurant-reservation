import { db } from "@/lib/db";
import { conversationSessions, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export interface NormalizedMessage {
  channel: "telegram" | "whatsapp";
  externalUserId: string;
  text: string;
  messageId?: string;
  from: { id: number; first_name?: string; last_name?: string; username?: string };
  isCallback?: boolean;
  callbackData?: string;
}

export class TelegramAdapter {
  async normalize(body: any): Promise<NormalizedMessage | null> {
    const message = body?.message ?? body?.callback_query;
    if (!message) return null;

    if (body?.callback_query) {
      const from = message.from;
      return {
        channel: "telegram",
        externalUserId: String(from.id),
        text: message.data || "",
        messageId: String(from.id),
        from: { id: from.id, first_name: from.first_name, last_name: from.last_name, username: from.username },
        isCallback: true,
        callbackData: message.data,
      };
    }

    const from = message.from;
    return {
      channel: "telegram",
      externalUserId: String(from.id),
      text: message.text || "",
      messageId: String(message.message_id),
      from: { id: from.id, first_name: from.first_name, last_name: from.last_name, username: from.username },
    };
  }
}
