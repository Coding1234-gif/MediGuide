import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, integrationStatus } from "@/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Private document storage. Objects are only ever read server-side after an
 * ownership check; no public URLs are generated.
 */
export interface DocumentStorage {
  put(objectPath: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(objectPath: string): Promise<Uint8Array>;
  remove(objectPath: string): Promise<void>;
}

class SupabaseDocumentStorage implements DocumentStorage {
  private bucket = env.SUPABASE_STORAGE_BUCKET;
  async put(objectPath: string, bytes: Uint8Array, contentType: string) {
    const { error } = await createSupabaseAdminClient().storage.from(this.bucket).upload(objectPath, bytes, { contentType, upsert: false });
    if (error) throw new Error(`storage.put failed: ${error.message}`);
  }
  async get(objectPath: string) {
    const { data, error } = await createSupabaseAdminClient().storage.from(this.bucket).download(objectPath);
    if (error || !data) throw new Error(`storage.get failed: ${error?.message ?? "no data"}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  async remove(objectPath: string) {
    const { error } = await createSupabaseAdminClient().storage.from(this.bucket).remove([objectPath]);
    if (error) throw new Error(`storage.remove failed: ${error.message}`);
  }
}

/** Local filesystem storage under .data/uploads for development without Supabase. */
class LocalDocumentStorage implements DocumentStorage {
  private root = path.resolve(process.cwd(), env.MEDIGUIDE_DATA_DIR, "uploads");
  private resolve(objectPath: string) {
    const full = path.resolve(this.root, objectPath);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage path");
    return full;
  }
  async put(objectPath: string, bytes: Uint8Array) {
    const full = this.resolve(objectPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: "wx" });
  }
  async get(objectPath: string) {
    return new Uint8Array(await readFile(this.resolve(objectPath)));
  }
  async remove(objectPath: string) {
    await rm(this.resolve(objectPath), { force: true });
  }
}

let instance: DocumentStorage | undefined;
export function getDocumentStorage(): DocumentStorage {
  instance ??= integrationStatus().storage === "supabase" ? new SupabaseDocumentStorage() : new LocalDocumentStorage();
  return instance;
}

export function setDocumentStorageForTests(storage: DocumentStorage) {
  instance = storage;
}
