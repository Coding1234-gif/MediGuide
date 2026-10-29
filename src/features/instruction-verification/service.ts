import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import type { VerifyExtractionRequest } from "@/lib/validation/extraction";
import { assessSchedulability } from "@/lib/scheduler/validation";

/** Fetch an extraction only if its document belongs to `userId`. */
export async function getExtractionForUser(userId: string, extractionId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ extraction: schema.extractions, document: schema.documents })
    .from(schema.extractions)
    .innerJoin(schema.documents, eq(schema.extractions.documentId, schema.documents.id))
    .where(and(eq(schema.extractions.id, extractionId), eq(schema.documents.userId, userId), isNull(schema.documents.deletedAt)));
  if (!row) throw new ApiError("not_found", "Extraction not found.");
  return row;
}

/**
 * Save the user's verified snapshot. The raw AI extraction is never modified.
 * Verification records that the user checked the transcription — it does NOT
 * make ambiguous instructions schedulable; that is decided separately.
 */
export async function verifyExtraction(userId: string, extractionId: string, body: VerifyExtractionRequest) {
  const { extraction } = await getExtractionForUser(userId, extractionId);
  const db = await getDb();
  const live = await db
    .select({ id: schema.schedules.id })
    .from(schema.schedules)
    .where(and(eq(schema.schedules.extractionId, extraction.id), eq(schema.schedules.status, "active")));
  if (live.length > 0) {
    throw new ApiError("conflict", "A schedule already uses these instructions. Cancel it before changing the verified details.");
  }
  const [row] = await db
    .update(schema.extractions)
    .set({ verifiedFields: body.fields, validationStatus: "verified", verifiedAt: new Date() })
    .where(eq(schema.extractions.id, extraction.id))
    .returning();
  return { extraction: row, schedulability: assessSchedulability(body.fields) };
}
