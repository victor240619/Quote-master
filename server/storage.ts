import {
  users,
  companies,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(userId: string, data: Partial<User>): Promise<User>;

  // Company operations
  getCompanyByUser(userEmail: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(companyId: string, data: Partial<Company>): Promise<Company>;
  listCompanies(): Promise<Company[]>;

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
}

export const storage = new DatabaseStorage();
