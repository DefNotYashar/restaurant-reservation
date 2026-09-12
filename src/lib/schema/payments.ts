import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { uuid, integer, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { reservations } from "./reservations";
import { relations } from "drizzle-orm";

export const paymentStatus = pgEnum("payment_status", ["PENDING", "PAID", "FAILED", "CANCELLED"]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("IRT").notNull(),
  status: paymentStatus("status").default("PENDING").notNull(),
  authority: varchar("authority", { length: 50 }),
  referenceId: varchar("reference_id", { length: 100 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  reservation: one(reservations, {
    fields: [payments.reservationId],
    references: [reservations.id],
  }),
}));
