import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | null = null;

export function createDbClient(databaseUrl?: string): Database {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    console.error("[Database] WARNING: DATABASE_URL environment variable is missing!");
    const sql = neon("postgresql://missing_db_url:missing_db_url@localhost:5432/missing");
    return drizzle(sql, { schema });
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export function getDb(): Database {
  if (!cachedDb) {
    cachedDb = createDbClient();
  }
  return cachedDb;
}

export * from "./schema";
export { eq, and, or, desc, asc, gte, lte, between, sql, ne, inArray, isNull } from "drizzle-orm";
