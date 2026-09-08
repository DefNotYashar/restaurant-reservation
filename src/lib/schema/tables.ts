import { pgTable, uuid, varchar, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";

export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  capacity: integer("capacity").notNull(),
  status: varchar("status", { length: 50 }).default("AVAILABLE").notNull(),
  x: doublePrecision("x").default(0).notNull(),
  y: doublePrecision("y").default(0).notNull(),
  width: doublePrecision("width").default(80).notNull(),
  height: doublePrecision("height").default(80).notNull(),
  rotation: doublePrecision("rotation").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
