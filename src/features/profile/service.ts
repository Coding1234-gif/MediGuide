import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { NotificationPreferences } from "@/lib/db/schema";

export async function ensureProfile(userId: string): Promise<void> {
  const db = await getDb();
  await db.insert(schema.profiles).values({ id: userId }).onConflictDoNothing();
}

export async function getProfile(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
  return row ?? null;
}

export async function updateProfile(
  userId: string,
  patch: { timezone?: string; notificationPreferences?: NotificationPreferences },
) {
  const db = await getDb();
  const [row] = await db
    .update(schema.profiles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.profiles.id, userId))
    .returning();
  return row;
}
