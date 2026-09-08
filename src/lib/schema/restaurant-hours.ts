import { pgTable, uuid, varchar, time, integer, date, timestamp, text } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
export const restaurantHours = pgTable("restaurant_hours", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sat ... 6=Fri per Persian week, or 0=Sun
  openTime: time("open_time").notNull(),
  closeTime: time("close_time").notNull(),
  maxOnlinePerSlot: integer("max_online_per_slot"),
});
export const closedDates = pgTable("closed_dates", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  date: date("date").notNull(),
  reason: varchar("reason", { length: 255 }),
});
export const blockedPeriods = pgTable("blocked_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
});
