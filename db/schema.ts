// db/schema.ts
import {
  sqliteTable,
  integer,
  text,
  real,
  blob
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  username:     text('username').unique().notNull(),
  password:     text('password').notNull(),
  email:        text('email').unique().notNull(),
  fullName:     text('full_name').notNull(),
  phoneNumber:  text('phone_number'),
  nation:       text('nation'),
  paymentIdentifier: text('payment_identifier'),
  cpf:          text('cpf'),
  ssn:          text('ssn'),
  birthdate:    text('birthdate'), // SQLite stores dates as text
  address:      text('address'),
  documentNumbers: text('document_numbers').default('{}'), // JSON as text
  additionalFields: text('additional_fields').default('{}'), // JSON as text
  createdAt:    text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  googleCalendarEnabled: integer('google_calendar_enabled', { mode: 'boolean' }).default(false),
  googleRefreshToken: text('google_refresh_token'),
});

export const hedges = sqliteTable('hedges', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  userId:           integer('user_id').references(() => users.id),
  baseCurrency:     text('base_currency').notNull(),
  targetCurrency:   text('target_currency').notNull(),
  amount:           real('amount').notNull(),
  rate:             real('rate').notNull(),
  duration:         integer('duration').notNull(),          // in days
  margin:           real('margin'), // optional
  status:           text('status').notNull(),               // active, completed, cancelled
  broker:           text('broker').default('tickmill'),     // default broker
  tradeOrderNumber: text('trade_order_number'),             // stored as text to handle big numbers
  tradeStatus:      text('trade_status'),                   // open, closed, etc
  createdAt:        text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  completedAt:      text('completed_at'),
  tradeDirection:   text('tradeDirection').notNull(),
});

export const trades = sqliteTable('trades', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  userId:        integer('user_id').notNull(),
  ticket:        text('ticket').notNull(),
  broker:        text('broker').notNull(),
  volume:        real('volume').notNull(),
  symbol:        text('symbol').notNull(),
  openTime:      text('open_time').notNull(),
  durationDays:  integer('duration_days').notNull(),

  // Order status in the DB; use .default() instead of sql``  
  status:        text('status').notNull().default('open'),
  closedAt:      text('closed_at'),
  hedgeId:       integer('hedge_id'),

  // Basic timestamps
  createdAt:     text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt:     text('updated_at').notNull().default('CURRENT_TIMESTAMP'),

  // ← Flask integration columns
  flaskTradeId:  integer('flask_trade_id'),
  metadata:      text('metadata').notNull().default('{}'), // JSON as text

  // RLS flag if you need it
  enableRLS:     integer('enable_rls', { mode: 'boolean' }).notNull().default(false),
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
