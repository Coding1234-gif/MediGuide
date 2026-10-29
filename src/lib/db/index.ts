import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { env } from "@/config/env";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle", "migrations");

declare global {
  var __mediguideDb: Promise<Database> | undefined;
}

async function connect(): Promise<Database> {
  if (env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare: false is required for Supabase's transaction-mode pooler.
    const client = postgres(env.DATABASE_URL, { prepare: false, max: 5 });
    return drizzle(client, { schema }) as unknown as Database;
  }
  // Local fallback: embedded Postgres (PGlite) persisted under .data/. Never used in production.
  if (env.NODE_ENV === "production" && !env.MEDIGUIDE_DEMO_MODE) {
    throw new Error("DATABASE_URL is required in production.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.resolve(process.cwd(), env.MEDIGUIDE_DATA_DIR, "pglite");
  await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Database;
}

/** Lazily-initialised singleton (survives Next.js dev hot reloads). */
export function getDb(): Promise<Database> {
  globalThis.__mediguideDb ??= connect().catch((err) => {
    globalThis.__mediguideDb = undefined;
    throw err;
  });
  return globalThis.__mediguideDb;
}

export { schema };
