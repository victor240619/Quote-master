import {
  users,
  companies,
  paymentSettings,
  quoteDrafts,
  quoteItems,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type QuoteDraft,
  type InsertQuoteDraft,
  type QuoteItem,
  type InsertQuoteItem,
  type PaymentSettings,
  type InsertPaymentSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for user authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(userId: string, data: Partial<User>): Promise<User>;
  incrementFreeDownloads(userId: string): Promise<User>;
  updateSubscriptionStatus(userId: string, hasActiveSubscription: boolean): Promise<User>;

  // Company operations
  getCompanyByUser(userEmail: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(companyId: string, data: Partial<Company>): Promise<Company>;
  listCompanies(): Promise<Company[]>;

  // Payment settings operations
  getPaymentSettings(companyId: string): Promise<PaymentSettings | undefined>;
  upsertPaymentSettings(companyId: string, data: Partial<InsertPaymentSettings>): Promise<PaymentSettings>;

  // Quote operations
  createQuoteDraft(quote: InsertQuoteDraft): Promise<QuoteDraft>;
  updateQuoteDraft(quoteId: string, data: Partial<QuoteDraft>): Promise<QuoteDraft>;
  getQuoteDraft(quoteId: string): Promise<QuoteDraft | undefined>;
  listQuoteDrafts(userEmail?: string): Promise<QuoteDraft[]>;
  deleteQuoteDraft(quoteId: string): Promise<void>;

  // Quote item operations
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(itemId: string, data: Partial<QuoteItem>): Promise<QuoteItem>;
  deleteQuoteItem(itemId: string): Promise<void>;
  getQuoteItems(quoteDraftId: string): Promise<QuoteItem[]>;

  // Item suggestions
  listItemDescriptions(query?: string, limit?: number): Promise<string[]>;

  // Generate unique quote code
  generateQuoteCode(): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const updateData: any = { 
      stripeCustomerId,
      updatedAt: new Date() 
    };
    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getCompanyByUser(userEmail: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.createdBy, userEmail));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async updateCompany(companyId: string, data: Partial<Company>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  async listCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getPaymentSettings(companyId: string): Promise<PaymentSettings | undefined> {
    const [row] = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.companyId, companyId));
    return row;
  }

  async upsertPaymentSettings(companyId: string, data: Partial<InsertPaymentSettings>): Promise<PaymentSettings> {
    // Try update existing
    const existing = await this.getPaymentSettings(companyId);
    if (existing) {
      const [updated] = await db
        .update(paymentSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(paymentSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(paymentSettings)
      .values({
        companyId,
        pixPercent: (data as any)?.pixPercent ?? undefined,
        debitPercent: (data as any)?.debitPercent ?? undefined,
        creditPercent: (data as any)?.creditPercent ?? undefined,
        installmentMonthlyInterestPercent: (data as any)?.installmentMonthlyInterestPercent ?? undefined,
        passFeesToCustomerByDefault: (data as any)?.passFeesToCustomerByDefault ?? undefined,
      })
      .returning();
    return created;
  }

  async createQuoteDraft(quote: InsertQuoteDraft): Promise<QuoteDraft> {
    const [newQuote] = await db
      .insert(quoteDrafts)
      .values(quote)
      .returning();
    return newQuote;
  }

  async updateQuoteDraft(quoteId: string, data: Partial<QuoteDraft>): Promise<QuoteDraft> {
    const [quote] = await db
      .update(quoteDrafts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quoteDrafts.id, quoteId))
      .returning();
    return quote;
  }

  async getQuoteDraft(quoteId: string): Promise<QuoteDraft | undefined> {
    const [quote] = await db
      .select()
      .from(quoteDrafts)
      .where(eq(quoteDrafts.id, quoteId));
    return quote;
  }

  async listQuoteDrafts(userEmail?: string): Promise<QuoteDraft[]> {
    if (userEmail) {
      return await db
        .select()
        .from(quoteDrafts)
        .where(eq(quoteDrafts.createdBy, userEmail))
        .orderBy(desc(quoteDrafts.createdAt));
    }
    return await db
      .select()
      .from(quoteDrafts)
      .orderBy(desc(quoteDrafts.createdAt));
  }

  async deleteQuoteDraft(quoteId: string): Promise<void> {
    await db.delete(quoteDrafts).where(eq(quoteDrafts.id, quoteId));
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db
      .insert(quoteItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateQuoteItem(itemId: string, data: Partial<QuoteItem>): Promise<QuoteItem> {
    const [item] = await db
      .update(quoteItems)
      .set(data)
      .where(eq(quoteItems.id, itemId))
      .returning();
    return item;
  }

  async deleteQuoteItem(itemId: string): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.id, itemId));
  }

  async getQuoteItems(quoteDraftId: string): Promise<QuoteItem[]> {
    return await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteDraftId, quoteDraftId));
  }

  async listItemDescriptions(query?: string, limit: number = 10): Promise<string[]> {
    // Basic suggestion: distinct descriptions matching query
    // Note: drizzle distinct + ilike can be expressed via sql
    if (query && query.trim().length > 0) {
      const rows = await db.execute(sql`SELECT DISTINCT description FROM ${quoteItems} WHERE ${quoteItems.description} ILIKE ${'%' + query + '%'} LIMIT ${limit}`);
      // rows.rows is any[] with { description }
      // @ts-ignore
      return (rows.rows || []).map((r: any) => r.description).filter(Boolean);
    }
    const rows = await db.execute(sql`SELECT DISTINCT description FROM ${quoteItems} ORDER BY description ASC LIMIT ${limit}`);
    // @ts-ignore
    return (rows.rows || []).map((r: any) => r.description).filter(Boolean);
  }

  async generateQuoteCode(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Get the count of quotes created today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quoteDrafts)
      .where(
        and(
          sql`${quoteDrafts.createdAt} >= ${startOfDay}`,
          sql`${quoteDrafts.createdAt} < ${endOfDay}`
        )
      );
    
    const dailySequence = (countResult?.count || 0) + 1;
    const sequenceStr = String(dailySequence).padStart(3, '0');
    
    return `QT-${year}${month}-${sequenceStr}`;
  }

  async incrementFreeDownloads(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        freeDownloadsUsed: sql`${users.freeDownloadsUsed} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateSubscriptionStatus(userId: string, hasActiveSubscription: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        hasActiveSubscription,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
