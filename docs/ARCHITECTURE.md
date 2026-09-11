# Architecture

## Stack

Next.js 16 App Router + TypeScript + Tailwind v4 · Drizzle ORM + Supabase
Postgres · Telegram webhook bot · Vercel deploy. Persian RTL UI (Vazirmatn),
Lucide icons (project standard), no dnd-kit (native drag + tap-to-assign).

## Key routes

```text
/admin                  Today command center (today-locked)
/admin/reservations     Archive + manual booking
/admin/table-plan       Seating + integrated order panel
/admin/customers        Finished-visits history (day/month/all)
/admin/settings         Tables + menu (availability, price, station)
/admin/kitchen          Station board (KITCHEN)
/admin/kebab            Station board (KEBAB)
/waiter                 Redirects to /admin/table-plan (do not resurrect)
/admin/floor            Redirects to /admin/table-plan
```

## APIs

```text
Reservations  GET/POST /api/reservations · GET/PATCH/DELETE /api/reservations/[id]
Tables        GET/POST /api/tables · PATCH/DELETE /api/tables/[id]
Customers     GET /api/customers · PATCH /api/customers/[id]
Menu          GET /api/menu · POST /api/menu/items · PATCH/DELETE /api/menu/items/[id]
Orders        POST /api/orders · GET /api/orders?tableId= · GET /api/orders/active
              GET /api/orders/[id] · POST /api/orders/[id] (delta items)
Items         PATCH /api/order-items/[id] (status only)
Stations      GET /api/stations/[KITCHEN|KEBAB]?restaurantId=&include=ready
Misc          GET /api/restaurants · POST /api/availability
```

`restaurantId=ALL` is accepted everywhere and means "the (single) restaurant".

## Data model

Core: `restaurants, customers, tables, reservations (customer_notes,
staff_notes, code), reservation_tables, conversation_sessions, messages`.
Phase 3: `menu_categories, menu_items (station, active, available),
orders (no status column), order_items (name+station snapshots, own status)`.
Relations in `src/lib/schema/relations.ts`, exports in `src/lib/schema/index.ts`.

## Frontend modules (business logic lives here, not in components)

```text
src/lib/reservations.ts  presence, groupings, conflicts, actions
src/lib/tables.ts        table CRUD
src/lib/customers.ts     customer list + update
src/lib/orders.ts        station boards, active orders, summaries
src/lib/menu.ts          menu CRUD + availability
src/lib/services/       reservation-service (lifecycle guard),
                        availability-service (hours only, 30-min slots),
                        order-service (routing snapshot, derived status),
                        conversation-engine (bot flow, Asia/Tehran)
```

## Bot flow (Telegram)

`/start` → رزرو → ASK_NAME → ASK_PHONE → ASK_PARTY_SIZE (1–500) →
ASK_DATE (امروز/فردا → real Tehran date) → ASK_TIME (typed H/HH/H:MM +
FA/AR numerals + 30-min slot buttons) → ASK_NOTES (SKIP_NOTES) →
VALIDATE (hours only) → CREATE → SUCCESS. Starts PENDING.

## Invariants (do not regress)

- Slots capacity key = time-string; draft.date = real date; customer =
  customers-UUID via getOrCreate (never raw Telegram ID); TIME: prefix strip;
  /start resets stale sessions; legacy "today" drafts self-heal.
- `assignTables` auto-confirms PENDING only; never downgrades.
- Table deletes clear `reservation_tables` first (FK).
- `GET /api/tables` and menu handle `restaurantId=ALL`.
- Station screens poll every 5s (deliberate; no websocket infra).
