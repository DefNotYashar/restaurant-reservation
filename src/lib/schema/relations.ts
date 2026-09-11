import { relations } from "drizzle-orm";
import { restaurants } from "./restaurants";
import { users } from "./users";
import { customers } from "./customers";
import { tables } from "./tables";
import { reservations } from "./reservations";
import { reservationTables } from "./reservation-tables";
import { menuCategories, menuItems } from "./menu";
import { orders, orderItems } from "./orders";
import { conversationSessions } from "./conversation-sessions";
import { messages } from "./messages";

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  tables: many(tables),
  reservations: many(reservations),
  conversationSessions: many(conversationSessions),
}));

export const usersRelations = relations(users, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [customers.restaurantId],
    references: [restaurants.id],
  }),
  reservations: many(reservations),
  orders: many(orders),
  conversationSessions: many(conversationSessions),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  reservationTables: many(reservationTables),
  orders: many(orders),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [reservations.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [reservations.customerId],
    references: [customers.id],
  }),
  assignedBy: one(users, {
    fields: [reservations.assignedByUserId],
    references: [users.id],
  }),
  reservationTables: many(reservationTables),
}));

export const reservationTablesRelations = relations(reservationTables, ({ one }) => ({
  reservation: one(reservations, {
    fields: [reservationTables.reservationId],
    references: [reservations.id],
  }),
  table: one(tables, {
    fields: [reservationTables.tableId],
    references: [tables.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const conversationSessionsRelations = relations(conversationSessions, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [conversationSessions.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [conversationSessions.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(conversationSessions, {
    fields: [messages.sessionId],
    references: [conversationSessions.id],
  }),
}));
