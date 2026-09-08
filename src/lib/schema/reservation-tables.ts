import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { reservations } from "./reservations";
import { tables } from "./tables";

export const reservationTables = pgTable(
  "reservation_tables",
  {
    reservationId: uuid("reservation_id").references(() => reservations.id).notNull(),
    tableId: uuid("table_id").references(() => tables.id).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.reservationId, t.tableId] })],
);

export type ReservationTable = typeof reservationTables.$inferSelect;
export type NewReservationTable = typeof reservationTables.$inferInsert;
