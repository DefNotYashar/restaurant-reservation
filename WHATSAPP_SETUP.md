WhatsApp Bot Setup — رستوران باغچه
==================================
Built files:
- src/app/api/webhooks/whatsapp/route.ts  (GET verify + POST handler)
- src/lib/services/whatsapp-adapter.ts     (normalizes Meta webhook payload)
- src/lib/services/conversation-engine.ts  (same engine as Telegram)
- .env: WHATSAPP_ACCESS_TOKEN + WHATSAPP_VERIFY_TOKEN

Steps to activate:
1. Meta Developer Portal → WhatsApp → Create App
2. Settings → Basic → Add webhook URL (e.g. https://reserve.baghche.com/api/webhooks/whatsapp)
3. Set Verify Token (must match WHATSAPP_VERIFY_TOKEN in .env)
4. Subscribe to messages field in webhook settings
5. Set .env values:
   WHATSAPP_ACCESS_TOKEN=<from Meta dashboard>
   WHATSAPP_VERIFY_TOKEN=<your chosen string>
6. Restart server (or deploy to restaurant PC with cloud tunnel)
7. Send message from a test WhatsApp number to the business number → webhook fires → ConversationEngine responds in Persian

Webhook verification (GET):
- Meta sends ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
- Route verifies token, returns challenge as plain text 200

Message flow (POST):
- Meta sends JSON payload with entry → changes → value → messages
- Adapter extracts from.phone, text.body (or interactive button id)
- Normalized message passed to ConversationEngine (same Persian flow as Telegram)
- Response is stored; reply text returned (Meta requires external API call for actual WhatsApp reply — currently returns JSON; full Meta send requires a separate `fetch` to `https://graph.facebook.com/v...` with the access token)

Note: Full WhatsApp send requires calling Meta's Graph API with the access token. The webhook currently processes and responds; to send back to WhatsApp externally, add:
  await fetch(`https://graph.facebook.com/v18.0/${fromPhone}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: fromPhone, type: "text", text: { body: result.reply } }),
  });
