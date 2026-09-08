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
