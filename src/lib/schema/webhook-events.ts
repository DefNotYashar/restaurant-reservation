import { pgTable, uuid, varchar, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: varchar("channel", { length: 50 }).notNull(),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("webhook_events_unique").on(t.channel, t.externalEventId)]);
