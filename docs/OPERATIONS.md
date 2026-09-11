# Operations runbook

## Environments

- **Local dev**: `npm run dev` → http://localhost:3000, `.env.local` points to
  localhost Postgres (docker compose `db`, password `restaurant`).
  Local data is disposable test data. Never confuse with prod.
- **Prod**: Vercel deployment + Supabase Postgres. Bot token lives in
  `.env.local` (local) and Vercel env (prod). Never log it.

## Deploy (every `vercel --prod` creates a NEW URL)

```bash
node node_modules/.bin/vercel --prod   # global vercel NOT on PATH
```

Then immediately (bot runs OLD code otherwise):

```bash
TOKEN=$(grep TELEGRAM_BOT_TOKEN .env.local | cut -d= -f2)
curl "https://api.telegram.org/bot${TOKEN}/setWebhook" --data-urlencode "url=<NEW-URL>/api/webhooks/telegram"
curl "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"  # verify: url matches, pending 0, no error
```

## Migrations (manual SQL — no drizzle/ folder on purpose)

- Write migration to `supabase/migrations/NNN_*.sql` (idempotent: IF NOT EXISTS).
- User runs it in Supabase SQL Editor BEFORE deploying dependent code.
- Code must never reference a column before migration is confirmed.
- Applied so far: `002_orders_phase3.sql`, `003_menu_availability.sql`,
  `UPDATE restaurants SET max_party_size = 500`.

## Local DB recovery

```bash
open -a Docker
docker compose up -d db
npm run db:push     # create schema from code
npm run db:seed     # sample restaurant + 25 Persian tables
```

## Debugging prod

- Public read APIs work without secrets: `/api/restaurants`,
  `/api/tables?restaurantId=ALL`, `/api/reservations?restaurantId=ALL`,
  `/api/customers?restaurantId=ALL`, `/api/menu?restaurantId=ALL`.
- Backup prod: curl the above to files. Never reset prod data.
- Logs: `node node_modules/.bin/vercel logs <deployment> --environment production -n 20 -x`.
  Key lines: `availability rejected: {date, time, partySize, reason}`.

## Test data (local)

Seed demo reservations via `POST /api/reservations` (source STAFF), then PATCH
statuses/tableIds for color coverage. Wipe with:
`TRUNCATE reservation_tables, reservations, ... CASCADE` (keep restaurants/tables).

## Security debt

Supabase DB password was exposed in chat before — reset it, then update Vercel
`DATABASE_URL`. Outstanding.
