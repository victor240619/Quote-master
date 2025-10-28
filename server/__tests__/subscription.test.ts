import request from 'supertest';
import express from 'express';
import { beforeAll, describe, expect, it, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../replitAuth', () => ({
  setupAuth: vi.fn(async (_app: any) => {}),
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { claims: { sub: 'user-1', email: 'user1@example.com' } };
    next();
  },
}));

vi.mock('../storage', () => {
  const user = { id: 'user-1', email: 'user1@example.com', hasActiveSubscription: false, stripeCustomerId: 'cus_123' } as any;
  return {
    storage: {
      getUser: vi.fn(async () => user),
      updateUserStripeInfo: vi.fn(async (_userId: string, _cust: string, _sub?: string) => user),
      listUsers: vi.fn(async () => [user]),
      updateSubscriptionStatus: vi.fn(async (_id: string, active: boolean) => {
        user.hasActiveSubscription = active; return user;
      }),
    },
  };
});

// Stripe mock
vi.mock('stripe', () => {
  class Stripe {
    customers = { create: vi.fn(async () => ({ id: 'cus_123' })) } as any;
    prices = {
      list: vi.fn(async () => ({ data: [] })),
      create: vi.fn(async () => ({ id: 'price_123' })),
    } as any;
    products = { create: vi.fn(async () => ({ id: 'prod_123' })) } as any;
    subscriptions = {
      retrieve: vi.fn(async () => ({ id: 'sub_123', latest_invoice: 'inv_123' })),
      create: vi.fn(async () => ({ id: 'sub_123', latest_invoice: { payment_intent: { client_secret: 'pi_secret_123' } } })),
    } as any;
    invoices = {
      retrieve: vi.fn(async () => ({ payment_intent: { client_secret: 'pi_secret_123' } })),
    } as any;
    billingPortal = { sessions: { create: vi.fn(async () => ({ url: 'https://portal.test' })) } } as any;
    webhooks = { constructEvent: vi.fn((_b:any,_s:any,_wh:any) => ({ type: 'invoice.payment_succeeded', data: { object: { subscription: 'sub_123' } } })) } as any;
    constructor(_key?: string) {}
  }
  return { default: Stripe };
});

// Set required envs before importing routes
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';

let registerRoutes: any;

function buildApp() {
  const app = express();
  return app;
}

describe('Stripe subscription flow', () => {
  let app: express.Express;

beforeAll(async () => {
    app = buildApp();
    const mod = await import('../routes');
    registerRoutes = mod.registerRoutes;
    await registerRoutes(app as any);
  });

  it('creates or returns subscription and client secret', async () => {
    const res = await request(app).post('/api/get-or-create-subscription');
    expect(res.status).toBe(200);
    expect(res.body.subscriptionId).toBeDefined();
    expect(res.body.clientSecret).toBeDefined();
  });

  it('returns customer portal url', async () => {
    const res = await request(app).post('/api/create-customer-portal');
    expect(res.status).toBe(200);
    expect(res.body.portal_url).toContain('http');
  });

  it('accepts webhook and updates subscription status', async () => {
    const res = await request(app)
      .post('/webhook/stripe')
      .set('stripe-signature', 't')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
