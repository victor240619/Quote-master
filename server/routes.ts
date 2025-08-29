import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertQuoteDraftSchema, insertQuoteItemSchema } from "@shared/schema";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/companies/me', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const company = await storage.getCompanyByUser(userEmail);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const companyData = insertCompanySchema.parse({
        ...req.body,
        createdBy: userEmail,
      });
      
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      delete updateData.id;
      delete updateData.createdBy;
      delete updateData.createdAt;
      
      const company = await storage.updateCompany(id, updateData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Quote routes
  app.get('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const userEmail = user?.role === 'admin' ? undefined : req.user.claims.email;
      const quotes = await storage.listQuoteDrafts(userEmail);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const quote = await storage.getQuoteDraft(id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const items = await storage.getQuoteItems(id);
      res.json({ ...quote, items });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const company = await storage.getCompanyByUser(userEmail);
      
      if (!company) {
        return res.status(400).json({ message: "Company not found. Please create a company first." });
      }

      const code = await storage.generateQuoteCode();
      
      const quoteData = insertQuoteDraftSchema.parse({
        ...req.body,
        code,
        companyId: company.id,
        createdBy: userEmail,
      });
      
      const quote = await storage.createQuoteDraft(quoteData);
      res.json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const quote = await storage.getQuoteDraft(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = req.body;
      delete updateData.id;
      delete updateData.code;
      delete updateData.createdBy;
      delete updateData.companyId;
      delete updateData.createdAt;
      
      const updatedQuote = await storage.updateQuoteDraft(id, updateData);
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const quote = await storage.getQuoteDraft(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteQuoteDraft(id);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Quote items routes
  app.post('/api/quotes/:quoteId/items', isAuthenticated, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const quote = await storage.getQuoteDraft(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      const itemData = insertQuoteItemSchema.parse({
        ...req.body,
        quoteDraftId: quoteId,
      });
      
      const item = await storage.createQuoteItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating quote item:", error);
      res.status(500).json({ message: "Failed to create quote item" });
    }
  });

  app.get('/api/quotes/:quoteId/items', isAuthenticated, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const quote = await storage.getQuoteDraft(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getQuoteItems(quoteId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      res.status(500).json({ message: "Failed to fetch quote items" });
    }
  });

  app.put('/api/quotes/:quoteId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { quoteId, itemId } = req.params;
      const quote = await storage.getQuoteDraft(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = req.body;
      delete updateData.id;
      delete updateData.quoteDraftId;
      delete updateData.createdAt;
      
      const item = await storage.updateQuoteItem(itemId, updateData);
      res.json(item);
    } catch (error) {
      console.error("Error updating quote item:", error);
      res.status(500).json({ message: "Failed to update quote item" });
    }
  });

  app.delete('/api/quotes/:quoteId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { quoteId, itemId } = req.params;
      const quote = await storage.getQuoteDraft(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && quote.createdBy !== req.user.claims.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteQuoteItem(itemId);
      res.json({ message: "Quote item deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote item:", error);
      res.status(500).json({ message: "Failed to delete quote item" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.listUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/companies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const companies = await storage.listCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
      if (adminUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      const updateData = req.body;
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      const user = await storage.updateUser(id, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Stripe subscription routes
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      let user = await storage.getUser(userId);

      if (!user || !userEmail) {
        return res.status(400).json({ error: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent']
        });

        return res.json({
          subscriptionId: subscription.id,
          clientSecret: (invoice as any).payment_intent?.client_secret || null,
        });
      }

      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail,
        });

        user = await storage.updateUserStripeInfo(userId, customer.id);

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: process.env.STRIPE_PRICE_ID || 'price_1234567890',
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

        const invoice = subscription.latest_invoice as any;
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: invoice.payment_intent?.client_secret,
        });
      } catch (error: any) {
        console.error("Stripe error:", error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post('/api/create-customer-portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No customer found" });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/subscription`,
      });

      res.json({ portal_url: portalSession.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
