import { pgTable, uuid, varchar, time, integer, timestamp } from "drizzle-orm/pg-core";

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: varchar("address", { length: 500 }),
  openTime: time("open_time").notNull(),
  closeTime: time("close_time").notNull(),
  reservationDurationMinutes: integer("reservation_duration_minutes").default(90).notNull(),
  bufferMinutes: integer("buffer_minutes").default(15).notNull(),
  maxPartySize: integer("max_party_size").default(10).notNull(),
  minAdvanceDays: integer("min_advance_days").default(0).notNull(),
  maxAdvanceDays: integer("max_advance_days").default(30).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
