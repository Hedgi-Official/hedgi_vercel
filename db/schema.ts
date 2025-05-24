import { pgTable, text, serial, timestamp, decimal, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hedges = pgTable("hedges", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  baseCurrency: text("base_currency").notNull(),
  targetCurrency: text("target_currency").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
  duration: integer("duration").notNull(), // in days
  margin: decimal("margin", { precision: 10, scale: 2 }), // Margin amount for the hedge
  status: text("status").notNull(), // active, completed, cancelled
  broker: text("broker").default("tickmill"), // Broker used for the trade (e.g., 'activtrades', 'tickmill')
  tradeOrderNumber: text("trade_order_number"), // Trade order number (stored as text to handle large values)
  tradeStatus: text("trade_status"), // Trade status (open, closed, etc)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  flaskTradeId: integer("flask_trade_id").notNull(), // ID from Flask service
  symbol: text("symbol").notNull(), // Currency pair symbol (e.g., USDMXN)
  direction: text("direction").notNull(), // 'buy' or 'sell'
  volume: decimal("volume", { precision: 10, scale: 4 }).notNull(), // Trade volume
  status: text("status").notNull().default('NEW'), // NEW, Executed, Closed, FAILED
  metadata: jsonb("metadata"), // Additional trade metadata from Flask (JSON object)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  hedges: many(hedges),
  trades: many(trades),
}));

export const hedgeRelations = relations(hedges, ({ one }) => ({
  user: one(users, {
    fields: [hedges.userId],
    references: [users.id],
  }),
}));

export const tradeRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Hedge = typeof hedges.$inferSelect;
export type NewHedge = typeof hedges.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;