import { apiRequest } from "@/lib/queryClient";
import type { QuoteDraft, InsertQuoteDraft, QuoteItem, InsertQuoteItem } from "@shared/schema";

export class QuoteDraftEntity {
  static async list(): Promise<QuoteDraft[]> {
    const response = await apiRequest("GET", "/api/quotes");
    return response.json();
  }

  static async get(quoteId: string): Promise<QuoteDraft & { items: QuoteItem[] }> {
    const response = await apiRequest("GET", `/api/quotes/${quoteId}`);
    return response.json();
  }

  static async create(quote: Omit<InsertQuoteDraft, 'code' | 'companyId' | 'createdBy'>): Promise<QuoteDraft> {
    const response = await apiRequest("POST", "/api/quotes", quote);
    return response.json();
  }

  static async update(quoteId: string, data: Partial<QuoteDraft>): Promise<QuoteDraft> {
    const response = await apiRequest("PUT", `/api/quotes/${quoteId}`, data);
    return response.json();
  }

  static async delete(quoteId: string): Promise<void> {
    await apiRequest("DELETE", `/api/quotes/${quoteId}`);
  }

  static async getItems(quoteId: string): Promise<QuoteItem[]> {
    const response = await apiRequest("GET", `/api/quotes/${quoteId}/items`);
    return response.json();
  }

  static async createItem(quoteId: string, item: Omit<InsertQuoteItem, 'quoteDraftId'>): Promise<QuoteItem> {
    const response = await apiRequest("POST", `/api/quotes/${quoteId}/items`, item);
    return response.json();
  }

  static async updateItem(quoteId: string, itemId: string, data: Partial<QuoteItem>): Promise<QuoteItem> {
    const response = await apiRequest("PUT", `/api/quotes/${quoteId}/items/${itemId}`, data);
    return response.json();
  }

  static async deleteItem(quoteId: string, itemId: string): Promise<void> {
    await apiRequest("DELETE", `/api/quotes/${quoteId}/items/${itemId}`);
  }
}

export { QuoteDraftEntity as QuoteDraft };
