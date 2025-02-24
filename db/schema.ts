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
  status: text("status").notNull(), // active, completed, cancelled
  tradeDirection: text("trade_direction").notNull(), // buy, sell
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const userRelations = relations(users, ({ many }) => ({
  hedges: many(hedges),
}));

export const hedgeRelations = relations(hedges, ({ one }) => ({
  user: one(users, {
    fields: [hedges.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Hedge = typeof hedges.$inferSelect;
export type NewHedge = typeof hedges.$inferInsert;