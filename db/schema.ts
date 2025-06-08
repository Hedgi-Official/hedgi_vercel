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
  nation:       text('nation'),
  paymentIdentifier: text('payment_identifier'),
  cpf:          text('cpf'),
  ssn:          text('ssn'),
  birthdate:    timestamp('birthdate'),
  address:      text('address'),
  documentNumbers: jsonb('document_numbers').default({}), // For storing various document types (passport, driver's license, etc.)
  additionalFields: jsonb('additional_fields').default({}), // For future extensibility (custom fields per country)
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  googleCalendarEnabled: boolean('google_calendar_enabled').default(false),
  googleRefreshToken: text('google_refresh_token'),
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
  tradeDirection:        text('tradeDirection').notNull(),
});

export const trades = pgTable('trades', {
  id:            serial('id').primaryKey(),
  userId:        integer('user_id').notNull(),
  ticket:        text('ticket').notNull(),
  broker:        text('broker').notNull(),
  volume:        numeric('volume', { precision: 10, scale: 2 }).notNull(),
  symbol:        text('symbol').notNull(),
  openTime:      timestamp('open_time').notNull(),
  durationDays:  integer('duration_days').notNull(),

  // Order status in the DB; use .default() instead of sql``  
  status:        text('status').notNull().default('open'),
  closedAt:      timestamp('closed_at'),
  hedgeId:       integer('hedge_id'),

  // Basic timestamps
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),

  // ← Flask integration columns
  flaskTradeId:  integer('flask_trade_id'),
  metadata:      jsonb('metadata').notNull().default({}), // JSONB default empty object

  // RLS flag if you need it
  enableRLS:     boolean('enable_rls').notNull().default(false),
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
