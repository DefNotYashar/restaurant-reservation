# Restaurant Reservation - Public Deploy Plan (Cloudflare Tunnel)

Status: Local Docker running (localhost:3000). DB healthy (postgres:16-alpine). Bot token configured.

Next steps:
1. Obtain TUNNEL_TOKEN from Cloudflare Zero Trust (dash.cloudflare.com -> Zero Trust -> Tunnels)
2. Add TUNNEL_TOKEN to .env
3. Restart cloudflared container (docker compose restart cloudflared)
4. Get public tunnel URL
5. Set Telegram webhook to <tunnel-url>/api/webhooks/telegram
6. Test bot message -> DB updates (messages table)

Current DB: messages(2), reservations(0), customers(1), audit_logs(0)
Current server: restaurant-reservation-app-1 (Up)

--- Updated Plan: Vercel + Neon PostgreSQL ---
Status: Better than Cloudflare tunnel for restaurant (no local DB dependency, permanent URL, free tier).
Steps:
1. Create Neon Postgres (neon.tech) -> get DATABASE_URL
2. Migrate local DB (pg_dump / drizzle-kit push / drizzle-kit migrate)
3. Update .env DATABASE_URL
4. Deploy: vercel --prod (public URL generated)
5. Set Telegram webhook: https://<app>.vercel.app/api/webhooks/telegram
6. Test bot + reservations end-to-end
DB password updated to new secret. Remember: do NOT expose password in future messages.
Webhook registered: https://temporary-sonic-aurora-veiz8kr.vercel.app/api/webhooks/telegram

=== FINAL STATUS (Updated) ===
- Deployed: https://restaurant-reservation-b9qmp7qml-defnotyashar.vercel.app (public URL, protection off)
- DB: Supabase (postgres.pcpvsvrmpblawxiwclkp:6543/postgres) with new password
- .env: DATABASE_URL, TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL set
- Schema: pushed (drizzle-kit push completed)
- Bot webhook: registered (Telegram API) — returns 200
- Note: Telegram blocked in Iran; bot saves messages but real-time messaging requires VPN/proxy or alternative platform
- Vercel env vars: DATABASE_URL, TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL added to production
- Admin landing: page.tsx = /admin content
