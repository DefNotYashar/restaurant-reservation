PERSIAN-FIRST DESIGN & BUILD PLAN — رستوران باغچه
===========================================
Locked direction: Persian-first + RTL + dark/amber + Vazirmatn + Jalali customer-facing dates + Persian digits + one shared copy system.
Dials: Dashboard 4/2/7 (dense cockpit) · Booking 6/4/3 (airy, step-transition only).
===========================================
1. PERSIAN FOUNDATION
  - locales/fa/common.ts, terminology.ts, dashboard.ts, reservations.ts, booking.ts, telegram.ts, whatsapp.ts, notifications.ts, errors.ts
  - src/lib/persian.ts (toFaDigits, formatJalali, formatToday)
  - DB enums stay English; UI mapped via terminology dict.
  - Source labels: تلگرام / واتساپ / وب / پرسنل
===========================================
2. DESIGN SYSTEM
  - Colors: zinc-950 / zinc-900 / zinc-800 / zinc-100 / amber-400 (locked, single accent)
  - Font: Vazirmatn everywhere
  - Radius: cards/input 12px (rounded-xl) / buttons 8px (rounded-lg) / status pills full
  - Numbers in mono; Persian digits everywhere
  - RTL: root dir=rtl + RTL-aware icons
===========================================
3. STAFF DASHBOARD /admin
  - Nav: میزها | رزروها | امروز | مشتریان | تنظیمات
  - Today (امروز): stat strip no card-boxes + timeline + drawer
  - Drawer: رزرو detail + actions (state-dependent)
===========================================
4. RESERVATIONS /admin/reservations
  - Filter bar + groups by date + drawer
===========================================
5. FLOOR /admin/floor
  - Segmented: نمایش سالن / ویرایش سالن
  - Canvas + inspector
===========================================
6. BOOKING /book — 4 steps
  1. تعداد مهمان  2. تاریخ  3. ساعت  4. اطلاعات  5. تأیید
===========================================
7. CUSTOMERS + SETTINGS
===========================================
8. TELEGRAM / WHATSAPP
  - Same conversation design via locales/fa/
===========================================
9. NOTIFICATIONS / ERRORS
  - All Persian; no technical errors exposed; inline errors + toast transient
===========================================
10. COMPONENTS
  - Existing (styled): Button, Badge, Card, Input/Select/Textarea
  - New: SideDrawer, StepIndicator, SlotGrid, StatStrip, SegmentedControl, FilterBar, EmptyState, Skeleton, Toast, PersianDatePicker
===========================================
11. PERSIAN-FIRST RULES ENFORCED
  - No Inter default; Vazirmatn locked
  - No purple/blue AI default; amber only
  - No pure #000/#fff; no green-blue-purple defaults
  - No 3-equal-card rows; no split-header; no zigzag >2; eyebrow max 1 per 3 sections; no duplicate CTA intent; no wrapped desktop CTAs
  - Real images: booking hero real; logo wall Simple Icons SVG; no fake-div screenshots; no hand-rolled decorative SVGs
  - Mobile collapse explicit; h-screen → min-h-[100dvh]
  - Motion: CSS transition only; reduced-motion honored; no window.scroll listener; no useState continuous values
  - Dark mode: dual by default; same palette across modes
===========================================
RESTAURANT NAME (example for bot/text): باغچه
