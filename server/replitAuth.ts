import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import memorystore from "memorystore";
import crypto from "crypto";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  let sessionStore: any;

  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    const MemoryStore = memorystore(session);
    sessionStore = new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 });
  }

  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  const enableLocalAdminLogin = process.env.ENABLE_LOCAL_ADMIN_LOGIN === 'true' || !process.env.REPLIT_DOMAINS;

  if (!enableLocalAdminLogin) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {} as any;
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  if (!enableLocalAdminLogin) {
    app.get("/api/login", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });
  } else {
    // Local admin login for development/debugging (guarded by ENABLE_LOCAL_ADMIN_LOGIN)
    app.post('/api/local-login', async (req: any, res) => {
      if (!enableLocalAdminLogin) {
        return res.status(403).json({ message: 'Local login disabled' });
      }
      const { username, password } = req.body || {};
      const expectedUser = process.env.LOCAL_ADMIN_USERNAME || 'admin_quote';
      const expectedPass = process.env.LOCAL_ADMIN_PASSWORD || '6run0955';
      if (username !== expectedUser || password !== expectedPass) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const claims = {
        sub: 'local-admin',
        email: 'admin@local',
        first_name: 'Admin',
        last_name: 'Local',
      };
      await upsertUser(claims);
      // Ensure role is admin
      const userRecord = await storage.getUser(claims.sub);
      if (userRecord && userRecord.role !== 'admin') {
        await storage.updateUser(userRecord.id, { role: 'admin' });
      }
      const user: any = { claims, access_token: 'local', refresh_token: 'local', expires_at: Math.floor(Date.now()/1000) + 7*24*3600 };
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ message: 'Login failed' });
        return res.json({ message: 'Logged in as admin (local)', user: { id: claims.sub, email: claims.email, role: 'admin' } });
      });
    });
  }

  app.get("/api/logout", (req, res) => {
    const enableLocalAdminLogin = process.env.ENABLE_LOCAL_ADMIN_LOGIN === 'true' || !process.env.REPLIT_DOMAINS;
    if (enableLocalAdminLogin) {
      req.logout(() => res.redirect('/'));
      return;
    }
    (async () => {
      const config = await getOidcConfig();
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    })();
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
