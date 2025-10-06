import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertQuoteDraftSchema, insertQuoteItemSchema } from "@shared/schema";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : (null as any);

// Middleware to check subscription status for premium features
const requireSubscriptionOrFreeTrial = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admins are exempt from subscription checks
    if ((user.role || '').toLowerCase() === 'admin') {
      return next();
    }

    // Check if user has active subscription
    if (user.hasActiveSubscription) {
      return next();
    }

    // Check if user still has free downloads available (first download is free)
    if (user.freeDownloadsUsed === 0) {
      return next();
    }

    // User has used free trial and doesn't have active subscription
    return res.status(402).json({ 
      message: "Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
      freeDownloadsUsed: user.freeDownloadsUsed 
    });

  } catch (error: any) {
    const msg = (error?.message || '').toString();
    // If DB is unavailable, allow access in local mode
    if (msg.includes('DATABASE_URL is not set')) {
      return next();
    }
    console.error("Error checking subscription:", error);
    res.status(500).json({ message: "Failed to check subscription status" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      const msg = (error?.message || '').toString();
      if (msg.includes('DATABASE_URL is not set')) {
        // Fallback: synthesize a minimal admin user from session claims for local debugging
        const claims = req.user?.claims || {};
        return res.json({
          id: claims.sub || 'local-admin',
          email: claims.email || 'admin@local',
          firstName: claims.first_name || 'Admin',
          lastName: claims.last_name || 'Local',
          role: 'admin',
          hasActiveSubscription: true,
          freeDownloadsUsed: 0,
        });
      }
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

  // Payment settings routes
  app.get('/api/payment-settings/me', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const company = await storage.getCompanyByUser(userEmail);
      if (!company) {
        return res.json(null);
      }
      const settings = await storage.getPaymentSettings(company.id);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  app.put('/api/payment-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const company = await storage.getCompanyByUser(userEmail);
      if (!company) {
        return res.status(400).json({ message: "Company not found. Please create a company first." });
      }
      const settings = await storage.upsertPaymentSettings(company.id, req.body || {});
      res.json(settings);
    } catch (error) {
      console.error("Error updating payment settings:", error);
      res.status(500).json({ message: "Failed to update payment settings" });
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

  // Item description suggestions for autocomplete
  app.get('/api/item-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const q = (req.query.q as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const suggestions = await storage.listItemDescriptions(q, Number.isFinite(limit) ? limit : 10);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error fetching item suggestions:", error);
      res.status(500).json({ message: "Failed to fetch item suggestions" });
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

  // Check if user can generate PDF (subscription or free trial)
  app.get('/api/check-pdf-access', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin bypass
      if ((user.role || '').toLowerCase() === 'admin') {
        return res.json({ canGenerate: true, hasActiveSubscription: true, freeDownloadsUsed: 0, isFreeTrial: false });
      }

      const canGenerate = user.hasActiveSubscription || user.freeDownloadsUsed === 0;
      
      res.json({ 
        canGenerate,
        hasActiveSubscription: user.hasActiveSubscription,
        freeDownloadsUsed: user.freeDownloadsUsed,
        isFreeTrial: user.freeDownloadsUsed === 0 && !user.hasActiveSubscription
      });
    } catch (error: any) {
      const msg = (error?.message || '').toString();
      if (msg.includes('DATABASE_URL is not set')) {
        // Local mode: allow
        return res.json({ canGenerate: true, hasActiveSubscription: true, freeDownloadsUsed: 0, isFreeTrial: false });
      }
      console.error("Error checking PDF access:", error);
      res.status(500).json({ message: "Failed to check PDF access" });
    }
  });

  // Endpoint to track PDF generation (increment free downloads counter)
  app.post('/api/track-pdf-download', isAuthenticated, requireSubscriptionOrFreeTrial, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If it's a free trial user (first download), increment the counter
      if (!user.hasActiveSubscription && user.freeDownloadsUsed === 0) {
        await storage.incrementFreeDownloads(userId);
        res.json({ 
          success: true, 
          message: "Free trial used. Subscribe to continue generating PDFs.",
          freeDownloadsUsed: 1
        });
      } else {
        res.json({ 
          success: true, 
          message: "PDF generated successfully",
          freeDownloadsUsed: user.freeDownloadsUsed
        });
      }
    } catch (error) {
      console.error("Error tracking PDF download:", error);
      res.status(500).json({ message: "Failed to track PDF download" });
    }
  });

  // Stripe subscription routes
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured' });
      }
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
      if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured' });
      }
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

  // Stripe webhook endpoint to handle subscription events  
  app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
  app.post('/webhook/stripe', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as any;
        try {
          const users = await storage.listUsers();
          const user = users.find(u => u.stripeCustomerId === subscription.customer);
          
          if (user) {
            const isActive = ['active', 'trialing'].includes(subscription.status);
            await storage.updateSubscriptionStatus(user.id, isActive);
            console.log(`Updated subscription status for user ${user.id}: ${isActive}`);
          }
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          try {
            const users = await storage.listUsers();
            const user = users.find(u => u.stripeSubscriptionId === invoice.subscription);
            
            if (user) {
              await storage.updateSubscriptionStatus(user.id, true);
              console.log(`Activated subscription for user ${user.id} after payment`);
            }
          } catch (error) {
            console.error('Error activating subscription after payment:', error);
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
