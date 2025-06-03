import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better connection management for Neon
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  allowExitOnIdle: true, // Allow the pool to close when there are no active connections
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('PG Pool error:', err);
});

// Handle client connection errors
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('PG Client error:', err);
  });
});

export const db = drizzle({ client: pool, schema });
