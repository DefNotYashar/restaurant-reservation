import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuCategories, menuItems, orders, orderItems, orderItemStatus, tables } from "@/lib/schema";

export type Station = "KITCHEN" | "KEBAB";
export type ItemStatus = (typeof orderItemStatus.enumValues)[number];

export interface SubmitItemInput {
  menuItemId: string;
  quantity: number;
  note?: string;
}

export interface SubmitOrderInput {
  restaurantId: string;
  tableId?: string;
  customerId?: string;
  note?: string;
  items: SubmitItemInput[];
}

const ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: [],
  CANCELLED: [],
};

/** Derived order status: never stored, always computed from items. */
export function deriveOrderStatus(items: { status: ItemStatus }[]): string {
  const live = items.filter((i) => i.status !== "CANCELLED");
  if (live.length === 0) return items.length > 0 ? "CANCELLED" : "NEW";
  if (live.every((i) => i.status === "SERVED")) return "SERVED";
  if (live.some((i) => i.status === "READY")) return "READY";
  if (live.some((i) => i.status === "PREPARING")) return "PREPARING";
  return "NEW";
}

export class OrderService {
  async getMenu(restaurantId: string) {
    const cats = await db
      .select()
      .from(menuCategories)
      .where(and(eq(menuCategories.restaurantId, restaurantId), eq(menuCategories.active, true)))
      .orderBy(menuCategories.sortOrder);
    const items = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.active, true)))
      .orderBy(menuItems.sortOrder);
    return cats.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) }));
  }

  async getOrder(id: string) {
    const order = await db.query.orders.findFirst({
      where: (o) => eq(o.id, id),
      with: { items: true, table: true, customer: true },
    });
    if (!order) return null;
    return { ...order, derivedStatus: deriveOrderStatus(order.items) };
  }

  /** Submit a full order: routing is snapshotted per item at this moment. */
  async submitOrder(input: SubmitOrderInput) {
    if (!input.items || input.items.length === 0) throw new Error("سفارش خالی است");

    const menuRows = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, input.restaurantId),
          inArray(
            menuItems.id,
            input.items.map((i) => i.menuItemId),
          ),
        ),
      );
    const byId = new Map(menuRows.map((m) => [m.id, m]));

    for (const item of input.items) {
      const menu = byId.get(item.menuItemId);
      if (!menu) throw new Error("آیتم منو پیدا نشد");
      if (!menu.active) throw new Error(`آیتم ${menu.name} غیرفعال است`);
      if (!menu.available) throw new Error(`آیتم ${menu.name} فعلاً موجود نیست`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error("تعداد نامعتبر است");
      }
    }

    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        customerId: input.customerId,
        note: input.note,
        source: "WAITER",
      })
      .returning();

    await db.insert(orderItems).values(
      input.items.map((item) => {
        const menu = byId.get(item.menuItemId)!;
        return {
          orderId: order.id,
          menuItemId: menu.id,
          name: menu.name,
          station: menu.station,
          quantity: item.quantity,
          note: item.note,
        };
      }),
    );

    return this.getOrder(order.id);
  }

  /** Re-submit: only brand-new items are created and sent. Existing items are never duplicated. */
  async addItems(orderId: string, items: SubmitItemInput[]) {
    const order = await db.query.orders.findFirst({ where: (o) => eq(o.id, orderId) });
    if (!order) throw new Error("سفارش پیدا نشد");
    if (!items || items.length === 0) throw new Error("آیتم جدیدی اضافه نشد");

    const menuRows = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, order.restaurantId),
          inArray(
            menuItems.id,
            items.map((i) => i.menuItemId),
          ),
        ),
      );
    const byId = new Map(menuRows.map((m) => [m.id, m]));

    const values = items.map((item) => {
      const menu = byId.get(item.menuItemId);
      if (!menu) throw new Error("آیتم منو پیدا نشد");
      if (!menu.active) throw new Error(`آیتم ${menu.name} غیرفعال است`);
      if (!menu.available) throw new Error(`آیتم ${menu.name} فعلاً موجود نیست`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error("تعداد نامعتبر است");
      }
      return {
        orderId,
        menuItemId: menu.id,
        name: menu.name,
        station: menu.station,
        quantity: item.quantity,
        note: item.note,
      };
    });

    const created = await db.insert(orderItems).values(values).returning();
    await db.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, orderId));
    return created;
  }

  /** Stations change item status only. Routing/name are snapshots and never edited here. */
  async setItemStatus(itemId: string, status: ItemStatus) {
    const existing = await db.query.orderItems.findFirst({ where: (i) => eq(i.id, itemId) });
    if (!existing) throw new Error("آیتم سفارش پیدا نشد");

    const allowed = ITEM_TRANSITIONS[existing.status as ItemStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`تغییر وضعیت آیتم از ${existing.status} به ${status} مجاز نیست`);
    }

    const [updated] = await db
      .update(orderItems)
      .set({ status, updatedAt: new Date() })
      .where(eq(orderItems.id, itemId))
      .returning();
    await db.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, existing.orderId));
    return updated;
  }

  /** Station board: live items for one station, newest first. Defaults to NEW + PREPARING. */
  async getStationBoard(restaurantId: string, station: Station, statuses: ItemStatus[] = ["NEW", "PREPARING"]) {
    const rows = await db
      .select({ item: orderItems, order: orders })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          eq(orderItems.station, station),
          inArray(orderItems.status, statuses),
        ),
      )
      .orderBy(desc(orders.createdAt));

    const tableIds = [...new Set(rows.map((r) => r.order.tableId).filter(Boolean))] as string[];
    const tableMap = new Map<string, string>();
    if (tableIds.length > 0) {
      const found = await db.select().from(tables).where(inArray(tables.id, tableIds));
      for (const t of found) tableMap.set(t.id, t.name);
    }
    return rows.map((r) => ({
      ...r.item,
      orderId: r.order.id,
      tableId: r.order.tableId,
      tableName: r.order.tableId ? (tableMap.get(r.order.tableId) ?? null) : null,
      orderNote: r.order.note,
      orderedAt: r.order.createdAt,
    }));
  }

  /** Tables with live orders (at least one item not SERVED/CANCELLED), for waiter overview. */
  async getActiveOrders(restaurantId: string) {
    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt))
      .limit(200);
    const full = await Promise.all(list.map((o) => this.getOrder(o.id)));
    return (full.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof this.getOrder>>>[]).filter(
      (o) => o.derivedStatus !== "SERVED" && o.derivedStatus !== "CANCELLED",
    );
  }

  async getTableOrders(tableId: string) {    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.tableId, tableId))
      .orderBy(desc(orders.createdAt));
    return Promise.all(
      list.map(async (o) => {
        const full = await this.getOrder(o.id);
        return full;
      }),
    );
  }
}
