import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db";
import { setDocumentStorageForTests, type DocumentStorage } from "@/lib/storage";

/** Fresh in-memory Postgres with real migrations, installed as the app's DB singleton. */
export async function installTestDb(): Promise<Database> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
  globalThis.__mediguideDb = Promise.resolve(db as unknown as Database);
  return db as unknown as Database;
}

export class MemoryStorage implements DocumentStorage {
  files = new Map<string, Uint8Array>();
  async put(p: string, b: Uint8Array) {
    if (this.files.has(p)) throw new Error("exists");
    this.files.set(p, b);
  }
  async get(p: string) {
    const b = this.files.get(p);
    if (!b) throw new Error("missing");
    return b;
  }
  async remove(p: string) {
    this.files.delete(p);
  }
}

export function installMemoryStorage() {
  const s = new MemoryStorage();
  setDocumentStorageForTests(s);
  return s;
}
