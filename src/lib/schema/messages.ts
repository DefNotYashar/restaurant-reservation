import { pgTable, uuid, varchar, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { conversationSessions } from "./conversation-sessions";

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => conversationSessions.id).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  externalMessageId: varchar("external_message_id", { length: 255 }),
  direction: varchar("direction", { length: 20 }).notNull(),
  text: text("text").notNull(),
  type: varchar("type", { length: 50 }),
  messageType: varchar("message_type", { length: 50 }).default("text"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("messages_channel_external_id_unique").on(t.channel, t.externalMessageId)]);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
