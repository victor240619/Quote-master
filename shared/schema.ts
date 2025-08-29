import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  numeric,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, admin, banned, deleted
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  logoUrl: varchar("logo_url"),
  subscriptionStatus: varchar("subscription_status").default("active"), // active, past_due, cancelled, blocked
  stripeCustomerId: varchar("stripe_customer_id"),
  blockedUntil: timestamp("blocked_until"),
  pendingBlockDate: timestamp("pending_block_date"),
  createdBy: varchar("created_by").notNull().references(() => users.email),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote items schema
export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteDraftId: varchar("quote_draft_id").notNull().references(() => quoteDrafts.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  neededQuantity: numeric("needed_quantity").notNull(),
  ownedQuantity: numeric("owned_quantity").default("0"),
  buyQuantity: numeric("buy_quantity").notNull(),
  total: numeric("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quote drafts table
export const quoteDrafts = pgTable("quote_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  title: varchar("title").notNull(),
  clientName: varchar("client_name"),
  clientEmail: varchar("client_email"),
  discount: numeric("discount").default("0"),
  currency: varchar("currency").default("BRL"),
  templateVariant: varchar("template_variant").default("variant_a"), // variant_a to variant_e
  note: text("note"),
  status: varchar("status").default("draft"), // draft, finalized
  pdfPath: varchar("pdf_path"),
  subtotal: numeric("subtotal"),
  total: numeric("total"),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  createdBy: varchar("created_by").notNull().references(() => users.email),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  companies: many(companies),
  quoteDrafts: many(quoteDrafts),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  quoteDrafts: many(quoteDrafts),
  createdByUser: one(users, {
    fields: [companies.createdBy],
    references: [users.email],
  }),
}));

export const quoteDraftsRelations = relations(quoteDrafts, ({ many, one }) => ({
  items: many(quoteItems),
  company: one(companies, {
    fields: [quoteDrafts.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [quoteDrafts.createdBy],
    references: [users.email],
  }),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quoteDraft: one(quoteDrafts, {
    fields: [quoteItems.quoteDraftId],
    references: [quoteDrafts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteDraftSchema = createInsertSchema(quoteDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type QuoteDraft = typeof quoteDrafts.$inferSelect;
export type InsertQuoteDraft = z.infer<typeof insertQuoteDraftSchema>;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
