# Restaurant Reservation System — باغچه

## Stack

- Next.js 16 (App Router) + TypeScript + React + Tailwind v4
- PostgreSQL + Drizzle ORM + drizzle-kit migrations
- Vazirmatn (Persian font) + RTL (dir="rtl")
- Telegram Bot API + WhatsApp Business API (Meta)
- Docker + docker-compose

## Architecture

```
Customer (Telegram / WhatsApp / Web)
       │
       ▼
Channel Adapter (TelegramAdapter / WhatsAppAdapter)
       │
       ▼
ConversationEngine (state machine: IDLE → ASK_NAME → ASK_PHONE → ASK_PARTY_SIZE → ASK_DATE → ASK_TIME → ASK_NOTES → VALIDATE → CREATE_RESERVATION → SUCCESS)
       │
       ▼
AvailabilityService (checks: restaurant hours, duration, buffer, table capacity, existing reservations)
       │
       ▼
ReservationService (getOrCreateCustomer → insert reservation with code #N, PENDING)
       │
       ▼
PostgreSQL (Supabase)
       │
       ▼
Admin Dashboard (Reservations, Table Plan, Customers, Settings)
```

## Key Components

- **ReservationService**: create/update/cancel/confirm/seat/complete/assign/modify
- **AvailabilityService**: checks availability, table suggestions, available time slots
- **ConversationEngine**: session tracking, Persian conversation flow
  - State machine: `IDLE → ASK_NAME → ASK_PHONE → ASK_PARTY_SIZE → ASK_DATE → ASK_TIME → ASK_NOTES → VALIDATE → CREATE_RESERVATION → SUCCESS`
  - Skip button for optional notes (`خیر` / `SKIP_NOTES`)
  - Dynamic time keyboard from available slots
  - Real-time availability validation before DB insert
  - Self-heals legacy drafts (`today`/`tomorrow` → real Tehran dates)
- **TelegramAdapter + WhatsAppAdapter**: normalize Meta/Telegram payloads
- **getOrCreateCustomer**: finds/creates customer by externalId + channel, returns UUID
- **Staff Dashboard**: `/admin` (امروز), `/admin/reservations`, `/admin/floor` (نقشه سالن)
- **Customer Booking**: `/book` (4-step Persian flow: guests → date → time → info → confirm)

## Bot Flow (Spec Compliant)

```
/start → IDLE
"رزرو" → ASK_NAME → name
ASK_PHONE → phone (required)
ASK_PARTY_SIZE → 1-20 (numeric)
ASK_DATE → "امروز" | "فردا" → Tehran date (YYYY-MM-DD)
ASK_TIME → H/HH/H:MM/HH:MM (Persian/Arabic numerals OK) + dynamic buttons
ASK_NOTES → optional notes + "خیر" skip button
VALIDATE → AvailabilityService.check()
CREATE_RESERVATION → getOrCreateCustomer → ReservationService.createReservation
SUCCESS → "رزرو شد." + details → IDLE
```

## Persian-First System

- All staff/customer UI in Persian
- Jalali calendar dates for customers (`formatJalali`)
- Persian digits (`toFaDigits`) applied to stats/time
- `PERSIAN_FIRST_PLAN.md`: locked design direction (restaurant باغچه, dark/amber, single accent, Vazirmatn)
- Terminology dictionary: `locales/fa/terminology.ts` (رزرو, میز, مهمان, نقشه سالن, تأیید, لغو, حاضر شد, نشست, etc.)
- Source labels: تلگرام / واتساپ / وب / پرسنل

## Files

Source: `src/lib/services/` (reservation-service, availability-service, conversation-engine, telegram-adapter, whatsapp-adapter)
DB Schema: `src/lib/schema/` (restaurants, users, customers, tables, reservations, reservation_tables, conversation_sessions, messages, relations)
UI Components: `src/components/ui/` (button, card, input, badge)
Pages: `src/app/admin/` (layout, page [امروز], reservations, floor), `src/app/book/` (4-step booking)
API Routes: `src/app/api/` (health, restaurants, reservations/[id], tables/[id], availability, webhooks/telegram, webhooks/whatsapp)
Locale: `src/lib/locales/fa/` (common, terminology, dashboard, booking, telegram, whatsapp, notifications, errors)
Utils: `src/lib/persian.ts` (formatters), `src/lib/utils.ts` (cn helper)
Deployment: `Dockerfile`, `docker-compose.yml`, `.env` (tokens saved securely)
Design Doc: `PERSIAN_FIRST_PLAN.md`

## Bot Tokens (.env — secured)

TELEGRAM_BOT_TOKEN=8551740884:...
WHATSAPP_ACCESS_TOKEN=WHATSAPP_TOKEN_READY
WHATSAPP_VERIFY_TOKEN=WHATSAPP_VERIFY_TOKEN_READY

## Production Status

- **TypeScript**: clean (0 errors)
- **Build**: passes
- **Production URL**: `https://restaurant-reservation-lgja3m8ct-defnotyashar.vercel.app`
- **Webhook**: `https://restaurant-reservation-lgja3m8ct-defnotyashar.vercel.app/api/webhooks/telegram`
- **Dashboard**: `/admin` running (port 3001 locally)
- **Booking**: `/book` connected to reservation engine
- **Bot Webhook**: wired (`api/webhooks/telegram` + `api/webhooks/whatsapp`)
- **Database**: Reservations persisting with customer UUID, phone, notes
- **Tables**: 6 tables seeded (2, 2, 4, 4, 6, 8 capacity)
- **WhatsApp Live**: requires Meta webhook URL + subscribe messages + real tokens
- **Telegram Live**: webhook set in BotFather

## Recent Changes (Latest Commit)

- Added `ASK_PHONE` state after `ASK_NAME` (required phone number)
- Added `ASK_NOTES` state after `ASK_TIME` (optional special requests)
- Added "خیر" (Skip) button to `ASK_NOTES` with `callback_data: SKIP_NOTES`
- Pass `notes` to `ReservationService.createReservation`
- Fixed `availability-service.ts`: capacity lookup key bug (time string vs numeric minutes)
- Fixed date handling: real Tehran dates instead of "today"/"tomorrow" literals
- Added availability rejection logging
- `getOrCreateCustomer` creates customer with phone, returns UUID
- Self-heals legacy "today"/"tomorrow" drafts to real Tehran dates
- Skip button (`callback_data: SKIP_NOTES`) for optional notes step

## Current Production Deployment

- **URL**: `https://restaurant-reservation-lgja3m8ct-defnotyashar.vercel.app`
- **Webhook**: `https://restaurant-reservation-lgja3m8ct-defnotyashar.vercel.app/api/webhooks/telegram`
- **Reservations table**: Persisting correctly (verified via `/api/reservations`)

## Next Steps (Per Spec)

1. **DB Migration**: Add `customer_notes`, `staff_notes` columns to `reservations`
2. **Admin Dashboard**: Reservation detail modal with staff actions (Assign, Confirm, Cancel, Staff Note)
3. **Table Plan Page**: Visual cards, UNASSIGNED sidebar, drag-drop/click-assign, conflict detection, capacity warning, time filter
4. **Customer Page**: List + profile with reservation history
5. **Admin API Extensions**: Assign table, Confirm, Cancel, Staff Note endpoints
5. **customer_requests table** + API for change/cancel requests