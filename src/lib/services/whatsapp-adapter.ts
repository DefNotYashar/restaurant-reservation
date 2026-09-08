import { db } from "@/lib/db";
import { messages, conversationSessions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export interface NormalizedMessage {
  channel: "whatsapp" | "telegram";
  externalUserId: string;
  text: string;
  messageId?: string;
  from?: { id: string; name?: string };
  isCallback?: boolean;
  callbackData?: string;
}

export class WhatsAppAdapter {
  async normalize(body: any): Promise<NormalizedMessage | null> {
    const entry = body?.entry?.[0];
    if (!entry) return null;
    const change = entry?.changes?.[0];
    if (!change) return null;
    const value = change?.value;
    if (!value) return null;

    const messagesData = value?.messages || [];
    if (messagesData.length === 0) return null;

    const msg = messagesData[0];
    const fromPhone = msg?.from || "";
    const textBody = msg?.text?.body || msg?.interactive?.button_reply?.title || msg?.interactive?.list_reply?.title || msg?.interactive?.button_reply?.id || "";

    return {
      channel: "whatsapp",
      externalUserId: String(fromPhone),
      text: String(textBody),
      messageId: msg?.id || "",
      from: { id: String(fromPhone), name: msg?.contacts?.[0]?.profile?.name },
    };
  }
}
