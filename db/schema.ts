import { pgTable, text, serial, timestamp, decimal, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
  googleCalendarEnabled: boolean("google_calendar_enabled").default(false),
  googleRefreshToken: text("google_refresh_token"),
});

export const hedges = pgTable("hedges", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  baseCurrency: text("base_currency").notNull(),
  targetCurrency: text("target_currency").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
  duration: integer("duration").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  calendarEventId: text("calendar_event_id").references(() => calendarEvents.id),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  googleEventId: text("google_event_id").notNull(),
  summary: text("summary").notNull(),
  description: text("description"),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  metadata: jsonb("metadata"),
  needsHedging: boolean("needs_hedging").default(false),
  hedgingReason: text("hedging_reason"),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  hedges: many(hedges),
  calendarEvents: many(calendarEvents),
}));

export const hedgeRelations = relations(hedges, ({ one }) => ({
  user: one(users, {
    fields: [hedges.userId],
    references: [users.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [hedges.calendarEventId],
    references: [calendarEvents.id],
  }),
}));

export const calendarEventRelations = relations(calendarEvents, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  hedges: many(hedges),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Hedge = typeof hedges.$inferSelect;
export type NewHedge = typeof hedges.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;