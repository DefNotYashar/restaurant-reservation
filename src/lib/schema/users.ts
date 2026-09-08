import { pgTable, uuid, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";

export const userRoles = pgEnum("user_role", ["OWNER", "MANAGER", "STAFF"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  role: userRoles("role").default("STAFF").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
