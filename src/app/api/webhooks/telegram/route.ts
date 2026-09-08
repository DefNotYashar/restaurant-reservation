import { NextResponse } from "next/server";
import { TelegramAdapter } from "@/lib/services/telegram-adapter";
import { ConversationEngine } from "@/lib/services/conversation-engine";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const adapter = new TelegramAdapter();
    const normalized = await adapter.normalize(body);

    if (!normalized) {
      return NextResponse.json({ ok: true });
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .limit(1);

    if (!restaurant) {
      console.error("Telegram webhook: no restaurant configured");
      return NextResponse.json(
        { ok: false, error: "No restaurant configured" },
        { status: 500 },
      );
    }

    const engine = new ConversationEngine();

    const result = await engine.handleMessage(
      normalized.channel,
      normalized.externalUserId,
      normalized.text,
      restaurant.id,
    );

    const token = process.env.TELEGRAM_BOT_TOKEN || "";

    if (token) {
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(normalized.externalUserId, 10),
            text: result.reply,
            reply_markup: result.keyboard
              ? {
                  inline_keyboard:
                    result.keyboard.inline_keyboard || [],
                }
              : undefined,
            parse_mode: "Markdown",
          }),
        },
      );
    }

    return NextResponse.json({
      ok: true,
      sent: !!token,
    });
  } catch (e) {
    console.error("Telegram webhook error:", e);

    return NextResponse.json(
      { ok: false, error: "خطای پردازش" },
      { status: 500 },
    );
  }
}
