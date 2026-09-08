import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  channel: varchar("channel", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
