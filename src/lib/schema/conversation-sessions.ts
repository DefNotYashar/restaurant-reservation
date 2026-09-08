import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { customers } from "./customers";

export const conversationSessions = pgTable("conversation_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  channel: varchar("channel", { length: 50 }).notNull(),
  externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  draft: jsonb("draft"),
  currentPrompt: varchar("current_prompt", { length: 100 }),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConversationSession = typeof conversationSessions.$inferSelect;
export type NewConversationSession = typeof conversationSessions.$inferInsert;
