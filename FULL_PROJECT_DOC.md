Restaurant Reservation System — باغچه
======================================

Stack
-----
Next.js 16 (App Router) + TypeScript + React + Tailwind v4
PostgreSQL + Drizzle ORM + drizzle-kit migrations
Vazirmatn (Persian font) + RTL (dir="rtl")
Telegram Bot API + WhatsApp Business API (Meta)
Docker + docker-compose

Architecture
------------
Customer (Telegram / WhatsApp / Web) → Channel Adapter → Conversation Engine → Reservation Engine → PostgreSQL → Staff Dashboard

Key Components
--------------
- ReservationService (create/update/cancel/confirm/seat/complete/assign/modify)
- AvailabilityService (check availability, table suggestions, available time slots)
- ConversationEngine (session tracking, Persian conversation flow: START → CREATE → GUESTS → DATE → TIME → NAME → PHONE → CONFIRM)
- TelegramAdapter + WhatsAppAdapter (normalize Meta/Telegram payloads)
- Staff Dashboard: /admin (امروز), /admin/reservations, /admin/floor (نقشه سالن)
- Customer Booking: /book (4-step Persian flow: guests → date → time → info → confirm)

Persian-First System
--------------------
- All staff/customer UI in Persian
- Jalali calendar dates for customers (`formatJalali`)
- Persian digits (`toFaDigits`) applied to stats/time
- `PERSIAN_FIRST_PLAN.md`: locked design direction (restaurant باغچه, dark/amber, single accent, Vazirmatn)
- Terminology dictionary: `locales/fa/terminology.ts` (رزرو, میز, مهمان, نقشه سالن, تأیید, لغو, حاضر شد, نشست, etc.)
- Source labels: تلگرام / واتساپ / وب / پرسنل

Files
-----
Source: `src/lib/services/` (reservation-service, availability-service, conversation-engine, telegram-adapter, whatsapp-adapter)
DB Schema: `src/lib/schema/` (restaurants, users, customers, tables, reservations, reservation_tables, conversation_sessions, messages, relations)
UI Components: `src/components/ui/` (button, card, input, badge)
Pages: `src/app/admin/` (layout, page [امروز], reservations, floor), `src/app/book/` (4-step booking)
API Routes: `src/app/api/` (health, restaurants, reservations/[id], tables/[id], availability, webhooks/telegram, webhooks/whatsapp)
Locale: `src/lib/locales/fa/` (common, terminology, dashboard, booking, telegram, whatsapp, notifications, errors)
Utils: `src/lib/persian.ts` (formatters), `src/lib/utils.ts` (cn helper)
Deployment: `Dockerfile`, `docker-compose.yml`, `.env` (tokens saved securely)
Design Doc: `PERSIAN_FIRST_PLAN.md`

Bot Tokens (.env — secured)
------------------------------
TELEGRAM_BOT_TOKEN=8551740884:...
WHATSAPP_ACCESS_TOKEN=WHATSAPP_TOKEN_READY
WHATSAPP_VERIFY_TOKEN=WHATSAPP_VERIFY_TOKEN_READY

Status
------
TypeScript: clean (0 errors)
Dashboard: running (`localhost:3001/admin` — port 3001, 3000 taken)
Booking: `/book` connected to reservation engine
Bot Webhook: wired (`api/webhooks/telegram` + `api/webhooks/whatsapp`)
WhatsApp Live: requires Meta webhook URL + subscribe messages + real tokens
Telegram Live: requires webhook URL in BotFather

===============================================================================
FULL ARCHITECTURE DETAILS — Expanded Technical Reference
===============================================================================

Bot Token (.env — secured, never exposed in logs/code):
  TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

WhatsApp Access Token (.env):
  WHATSAPP_ACCESS_TOKEN=WHATSAPP_TOKEN_READY
  WHATSAPP_VERIFY_TOKEN=WHATSAPP_VERIFY_TOKEN_READY

Conversation States (full state machine):
  IDLE (welcome: "سلام، برای رزرو کلمه «رزرو» را تایپ کنید.") →
  ASK_NAME (text input: نام) →
  ASK_PHONE (text input: شماره موبایل) →
  ASK_PARTY_SIZE (numeric 1–20) →
  ASK_DATE (امروز / فردا → Tehran date) →
  ASK_TIME (H/HH/H:MM/HH:MM + dynamic buttons from AvailabilityService) →
  ASK_NOTES (optional notes + "خیر" skip button) →
  VALIDATE (AvailabilityService.check) →
  CREATE_RESERVATION (getOrCreateCustomer → ReservationService.createReservation) →
  SUCCESS ("رزرو شد." + details) → IDLE
  ---
  CANCEL_RESERVATION (cancel flow using reservation code)
  MY_RESERVATIONS (show customer reservations from ReservationService.findByCustomer)
  CHECK_RESERVATION (check availability without creating)
  CONTACT (contact restaurant info)

Message Direction (database):
  INCOMING (customer message to bot) → stored in messages table
  OUTGOING (bot reply — currently returned directly; full persistence can be added)

Reservation Source Mapping (UI label → DB enum):
  تلگرام → TELEGRAM
  واتساپ → WHATSAPP
  وب → WEB
  پرسنل → STAFF

Status Mapping (DB enum → Persian label):
  PENDING → در انتظار
  CONFIRMED → تأیید شده
  ARRIVED → حاضر شد
  SEATED → نشست
  COMPLETED → تکمیل شد
  CANCELLED → لغو شده
  NO_SHOW → عدم حضور

---

## Recent Changes (2026-09-11)

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
