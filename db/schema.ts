// db/schema.ts
import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
  jsonb,
  boolean
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id:           serial('id').primaryKey(),
  username:     text('username').unique().notNull(),
  password:     text('password').notNull(),
  email:        text('email').unique().notNull(),
  fullName:     text('full_name').notNull(),
  phoneNumber:  text('phone_number'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

export const hedges = pgTable('hedges', {
  id:               serial('id').primaryKey(),
  userId:           integer('user_id').references(() => users.id),
  baseCurrency:     text('base_currency').notNull(),
  targetCurrency:   text('target_currency').notNull(),
  amount:           numeric('amount', { precision: 10, scale: 2 }).notNull(),
  rate:             numeric('rate',   { precision: 10, scale: 6 }).notNull(),
  duration:         integer('duration').notNull(),          // in days
  margin:           numeric('margin', { precision: 10, scale: 2 }), // optional
  status:           text('status').notNull(),               // active, completed, cancelled
  broker:           text('broker').default('tickmill'),     // default broker
  tradeOrderNumber: text('trade_order_number'),             // stored as text to handle big numbers
  tradeStatus:      text('trade_status'),                   // open, closed, etc
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  completedAt:      timestamp('completed_at'),
});

export const flaskTrades = pgTable('flask_trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  flaskTradeId: integer('flask_trade_id').notNull(),
  symbol: text('symbol').notNull(),
  direction: text('direction').notNull(),
  volume: decimal('volume', { precision: 10, scale: 4 }).notNull(),
  status: text('status').notNull().default('NEW'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  hedges: many(hedges),
  trades: many(trades),
}));

export const hedgeRelations = relations(hedges, ({ one }) => ({
  user: one(users, {
    fields:    [hedges.userId],
    references:[users.id],
  }),
}));

export const tradeRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields:    [trades.userId],
    references:[users.id],
  }),
}));

export const insertUserSchema   = createInsertSchema(users);
export const selectUserSchema   = createSelectSchema(users);
export type User     = typeof users.$inferSelect;
export type NewUser  = typeof users.$inferInsert;
export type Hedge    = typeof hedges.$inferSelect;
export type NewHedge = typeof hedges.$inferInsert;
export type Trade    = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
