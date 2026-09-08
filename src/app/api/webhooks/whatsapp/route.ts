import { NextResponse } from "next/server";
import { WhatsAppAdapter } from "@/lib/services/whatsapp-adapter";
import { ConversationEngine } from "@/lib/services/conversation-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const adapter = new WhatsAppAdapter();
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

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    if (accessToken && normalized?.from?.id) {
      try {
        await fetch(`https://graph.facebook.com/v18.0/${normalized.from.id}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalized.from.id,
            type: "text",
            text: { body: result.reply },
          }),
        });
      } catch (sendErr) {
        console.error("WhatsApp send error:", sendErr);
      }
    }

    return NextResponse.json({ ok: true, reply: result.reply, sent: !!accessToken });
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
    return NextResponse.json({ ok: false, error: "خطای پردازش" }, { status: 500 });
  }
}