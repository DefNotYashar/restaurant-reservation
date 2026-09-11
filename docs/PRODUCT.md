# Product Direction (master)

Read this before building anything. It overrides generic instincts.

## Mission

Evolving from a reservation bot into a practical restaurant operations system.
Goal: the simplest system that makes a real busy shift easier — not an ERP.

```text
BOT collects → DATABASE records → DASHBOARD organizes →
WAITER orders → KITCHEN/KEBAB prepare → STAFF decide
```

Never replace staff judgment with automation. Capacity is guidance, warnings are
informational, staff override everything.

## Reservation lifecycle (enforced in backend)

```text
PENDING → CONFIRMED → ARRIVED → COMPLETED
PENDING → CANCELLED → (reopen) PENDING
CONFIRMED → CANCELLED / NO_SHOW
ARRIVED → COMPLETED / CANCELLED
```

Downgrades (e.g. ARRIVED → CONFIRMED) are rejected with 409.
Assigning a PENDING to a table auto-confirms it. Unassigning never changes status.

## Color system (locked)

- Yellow = pending / needs attention
- Green = confirmed / coming / normal
- Blue = in restaurant (arrived/seated)
- Red = conflict / error / cancelled
- Gray = done / history

Amber is reserved for warnings (capacity, unassigned, selection).
Never rely on color alone; labels always accompany it.

## Dashboard tabs (stable — do not restructure)

| Tab | Job |
|---|---|
| امروز | Shift command center, TODAY ONLY. Attention strip + 5 color sections with inline actions. Never an archive. |
| رزروها | Archive/manager: any date, search, manual booking. No quick actions. |
| نقشه میزها | Seating + ordering entry. Accepted reservations only. Tap table → order panel; select-then-tap assigns/moves. |
| مشتریان | History only: COMPLETED / CANCELLED / NO_SHOW, grouped by customer. |
| تنظیمات | Tables + menu management. |
| آشپزخانه / کبابی | Station boards (NEW → PREPARING → READY → SERVED). |

## Drawer contract

ONE shared `ReservationDrawer`, opened by clicking any guest name on any page.
Guest edit (Customers API), fact-box editing (hours validated), table
assign/move/unassign, separate readonly customer note + editable staff note,
per-status legal actions only, `…` loading, API-success-then-refresh, inline
red errors, ×/Esc/outside closes without side effects.
During mutation all action controls disable; close/navigation stay live.

## Orders (Phase 3)

- `orders.status` is NEVER stored — derived from items.
- Routing decided once at submit, snapshotted per `order_items`.
- Drafts never reach stations. Re-submits send delta items only.
- Stations change item status only (guarded transitions).
- Waiter never sees KITCHEN/KEBAB routing.
- `menu_items.available` (orderable now) ≠ `active` (exists in menu).
- Table Plan shows a compact order summary; it is not an order workflow.

## Future (explicitly deferred — do not build)

Payments, printer routing, QR ordering, walk-in/VISIT module, auto
cancellation/changes, multi-restaurant, analytics, AI seating.
`VISIT` will later sit under CUSTOMER (optional reservation + table + orders).
The current model (customers independent of reservations) already allows this.

## Build order for new work

Reliability > staff speed > clarity > data correctness > tablet usability >
simplicity > features. Vertical slices (DB → backend → API → UI → real test).
Ask "what part of the real workflow is still difficult?" — never add features
for their own sake. A real shift test outranks any architecture proposal.
