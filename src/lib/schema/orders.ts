import { pgTable, uuid, varchar, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { customers } from "./customers";
import { tables } from "./tables";
import { menuItems, orderStation } from "./menu";

export const orderItemStatus = pgEnum("order_item_status", [
  "NEW",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
]);

// orders.status is intentionally NOT stored: it is derived from order_items.
// visit_id stays out until the future visit module exists; table + customer
// context is enough for Phase 3.
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  tableId: uuid("table_id").references(() => tables.id),
  customerId: uuid("customer_id").references(() => customers.id),
  note: text("note"),
  source: varchar("source", { length: 50 }).default("WAITER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id),
  // Snapshots at submit time: routing and naming never change afterwards,
  // even if the menu is edited later.
  name: varchar("name", { length: 150 }).notNull(),
  station: orderStation("station").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  note: text("note"),
  status: orderItemStatus("status").default("NEW").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
