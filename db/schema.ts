import { pgTable, text, serial, timestamp, decimal, integer } from "drizzle-orm/pg-core";
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
  ticket: text("ticket").notNull(), // MT5 order ID (from custom_order.ticket)
  broker: text("broker").notNull(), // Broker name (e.g., "fbs", from request context)
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(), // From custom_order.volume or trade_details.volume
  symbol: text("symbol").notNull(), // Currency pair symbol
  openTime: timestamp("open_time").notNull(), // Trade open time
  durationDays: integer("duration_days").notNull(), // Duration in days
  status: text("status").notNull().default('open'), // open, cancelled, closed_by_sl
  closedAt: timestamp("closed_at"), // When the trade was closed/cancelled
  hedgeId: integer("hedge_id").references(() => hedges.id), // Reference to associated hedge
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  hedge: one(hedges, {
    fields: [trades.hedgeId],
    references: [hedges.id],
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