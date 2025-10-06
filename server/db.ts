import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

function createStubDb() {
  const error = new Error(
    "DATABASE_URL is not set - database operations are disabled. Provide DATABASE_URL to enable persistence.",
  );
  return new Proxy({}, {
    get() {
      throw error;
    },
  }) as any;
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = process.env.DATABASE_URL
  ? drizzle({ client: pool as any, schema })
  : createStubDb();