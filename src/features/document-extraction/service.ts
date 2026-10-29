import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { getDocumentStorage } from "@/lib/storage";
import { runInstructionExtraction } from "@/lib/ai/extraction";
import { ExtractionProviderError } from "@/lib/ai/provider";
import { extensionFor, validateUploadedFile } from "@/lib/validation/files";
import { EXTRACTION_FIELD_KEYS } from "@/lib/validation/extraction";
import { logger } from "@/lib/utils/logger";

export async function uploadDocument(userId: string, file: { bytes: Uint8Array; declaredType: string; name: string }) {
  const check = validateUploadedFile(file.bytes, file.declaredType);
  if (!check.ok) {
    throw new ApiError(check.code === "too_large" ? "payload_too_large" : "unsupported_media_type", check.message);
  }
  const id = randomUUID();
  // Path is namespaced by owner and never derived from the user's filename.
  const storagePath = `${userId}/${id}.${extensionFor(check.mimeType)}`;
  const sha256 = createHash("sha256").update(file.bytes).digest("hex");

  await getDocumentStorage().put(storagePath, file.bytes, check.mimeType);
  const db = await getDb();
  try {
    const [row] = await db
      .insert(schema.documents)
      .values({
        id,
        userId,
        storagePath,
        originalName: file.name.slice(0, 200) || "document",
        fileType: check.mimeType,
        fileSize: file.bytes.length,
        sha256,
      })
      .returning();
    return row;
  } catch (err) {
    await getDocumentStorage().remove(storagePath).catch(() => undefined);
    throw err;
  }
}

/** Ownership-enforced lookup. Returns 404 (not 403) for other users' documents to avoid disclosure. */
export async function getDocumentForUser(userId: string, documentId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId), isNull(schema.documents.deletedAt)));
  if (!row) throw new ApiError("not_found", "Document not found.");
  return row;
}

export async function readDocumentBytes(userId: string, documentId: string) {
  const doc = await getDocumentForUser(userId, documentId);
  return { doc, bytes: await getDocumentStorage().get(doc.storagePath) };
}

export async function listDocuments(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.userId, userId), isNull(schema.documents.deletedAt)))
    .orderBy(desc(schema.documents.createdAt));
}

export async function getLatestExtraction(documentId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.extractions)
    .where(eq(schema.extractions.documentId, documentId))
    .orderBy(desc(schema.extractions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function extractDocument(userId: string, documentId: string) {
  const db = await getDb();
  const doc = await getDocumentForUser(userId, documentId);
  if (doc.extractionStatus === "processing") throw new ApiError("conflict", "Extraction is already in progress.");

  // Claim the document atomically so concurrent requests can't double-run the model.
  const claimed = await db
    .update(schema.documents)
    .set({ extractionStatus: "processing" })
    .where(and(eq(schema.documents.id, doc.id), eq(schema.documents.extractionStatus, doc.extractionStatus)))
    .returning({ id: schema.documents.id });
  if (claimed.length === 0) throw new ApiError("conflict", "Extraction is already in progress.");

  try {
    const bytes = await getDocumentStorage().get(doc.storagePath);
    const { result, modelIdentifier, live } = await runInstructionExtraction({
      bytes,
      mimeType: doc.fileType as "image/png",
      sha256: doc.sha256,
    });
    const evidence = Object.fromEntries(
      EXTRACTION_FIELD_KEYS.map((k) => [k, { source_text: result.fields[k].source_text, page: result.fields[k].page }]),
    );
    const extraction = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.extractions)
        .values({ documentId: doc.id, modelIdentifier, extractedFields: result, evidenceSpans: evidence })
        .returning();
      await tx.update(schema.documents).set({ extractionStatus: "completed" }).where(eq(schema.documents.id, doc.id));
      return row;
    });
    logger.info("extraction.completed", { documentId: doc.id, provider: modelIdentifier.split(":")[0], live });
    return { extraction, live };
  } catch (err) {
    await db.update(schema.documents).set({ extractionStatus: "failed" }).where(eq(schema.documents.id, doc.id));
    if (err instanceof ExtractionProviderError) {
      logger.warn("extraction.failed", { documentId: doc.id, code: err.code });
      throw new ApiError(err.code === "not_configured" ? "service_unavailable" : "unprocessable", err.message, {
        retryable: err.retryable,
        reason: err.code,
      });
    }
    throw err;
  }
}

/** Soft-delete the record and hard-delete the stored file (minimise retention of sensitive documents). */
export async function deleteDocument(userId: string, documentId: string) {
  const doc = await getDocumentForUser(userId, documentId);
  const db = await getDb();
  await db.update(schema.documents).set({ deletedAt: new Date() }).where(eq(schema.documents.id, doc.id));
  await getDocumentStorage().remove(doc.storagePath);
}
