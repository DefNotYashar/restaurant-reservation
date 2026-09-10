FULL PROJECT INSTRUCTION — Restaurant Reservation System

SETUP:
1. Clone / pull repo
2. .env: DATABASE_URL (Supabase), TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL
3. Docker: docker compose up -d (local DB + app) OR deploy Vercel
4. Vercel deploy: vercel --prod (public URL)
5. Set Telegram webhook: https://<url>/api/webhooks/telegram

ENVIRONMENT VARIABLES (Vercel):
- DATABASE_URL
- TELEGRAM_BOT_TOKEN
- NEXT_PUBLIC_APP_URL

DB MIGRATION:
- npx drizzle-kit push --config=drizzle.config.ts (needs dotenv)

BOT STATUS:
- Webhook working (200)
- DB saves messages (messages table)
- Conversation engine active (conversation_sessions)
- Note: Telegram blocked in Iran — requires VPN/proxy for live messaging

DOCUMENTATION:
- docs/deployment-plan.md
