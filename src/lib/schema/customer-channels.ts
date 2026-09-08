import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { customers } from "./customers";
export const customerChannels = pgTable("customer_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("customer_channels_unique").on(t.channel, t.externalId)]);
