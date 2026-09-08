import { NextResponse } from "next/server";
import { TelegramAdapter } from "@/lib/services/telegram-adapter";
import { ConversationEngine } from "@/lib/services/conversation-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const adapter = new TelegramAdapter();
    const normalized = await adapter.normalize(body);

    if (!normalized) {
      return NextResponse.json({ ok: true });
    }

    const engine = new ConversationEngine();
    let restaurantId = "";
    try {
      const restaurantRes = await fetch(new URL("/api/restaurants", req.url));
      if (restaurantRes.ok) {
        const restaurants = await restaurantRes.json();
        restaurantId = restaurants?.[0]?.id || "";
      }
    } catch {
      restaurantId = "";
    }

    const result = await engine.handleMessage(
      normalized.channel,
      normalized.externalUserId,
      normalized.text,
      restaurantId,
    );

    const token = process.env.TELEGRAM_BOT_TOKEN || "";
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parseInt(normalized.externalUserId, 10),
          text: result.reply,
          reply_markup: result.keyboard ? { inline_keyboard: (result.keyboard.inline_keyboard || []) } : undefined,
          parse_mode: "Markdown",
        }),
      });
    }

    return NextResponse.json({ ok: true, sent: !!token });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: false, error: "خطای پردازش" }, { status: 500 });
  }
}