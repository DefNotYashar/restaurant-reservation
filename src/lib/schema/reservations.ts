import { pgTable, uuid, varchar, text, integer, date, time, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { customers } from "./customers";
import { users } from "./users";

export const reservationStatus = pgEnum("reservation_status", [
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  // canonical interval - source of truth for overlap checks
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  partySize: integer("party_size").notNull(),
  status: reservationStatus("status").default("PENDING").notNull(),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  customerNotes: text("customer_notes"),
  staffNotes: text("staff_notes"),
  source: varchar("source", { length: 50 }).default("WEB").notNull(),
  assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),
  code: varchar("code", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
