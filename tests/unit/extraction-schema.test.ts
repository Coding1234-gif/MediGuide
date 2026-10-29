import { describe, expect, it } from "vitest";
import { SAMPLE_DOCUMENTS } from "@/lib/ai/fixtures";
import {
  extractionResultSchema,
  normalizeExtraction,
  verifyExtractionRequestSchema,
  initialVerifiedFields,
} from "@/lib/validation/extraction";
import { sniffMimeType, validateUploadedFile, MAX_UPLOAD_BYTES } from "@/lib/validation/files";

const clear = SAMPLE_DOCUMENTS[0].extraction;

describe("extraction schema", () => {
  it("accepts every bundled fixture", () => {
    for (const s of SAMPLE_DOCUMENTS) expect(extractionResultSchema.safeParse(s.extraction).success).toBe(true);
  });

  it("rejects output missing required fields", () => {
    const bad = structuredClone(clear) as Record<string, unknown>;
    delete (bad.fields as Record<string, unknown>).frequency;
    expect(extractionResultSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects requires_user_verification=false", () => {
    expect(extractionResultSchema.safeParse({ ...clear, requires_user_verification: false }).success).toBe(false);
  });

  it("normalises an 'extracted' field with no value to missing", () => {
    const r = structuredClone(clear);
    r.fields.duration = { value: "  ", source_text: null, status: "extracted", page: null };
    expect(normalizeExtraction(r).fields.duration.status).toBe("missing");
  });

  it("downgrades a value without source evidence to needs_verification", () => {
    const r = structuredClone(clear);
    r.fields.frequency = { value: "Twice a day", source_text: null, status: "extracted", page: null };
    expect(normalizeExtraction(r).fields.frequency.status).toBe("needs_verification");
  });
});

describe("verification request", () => {
  it("requires the user to attest they compared with the original", () => {
    const fields = initialVerifiedFields(clear);
    expect(verifyExtractionRequestSchema.safeParse({ fields, matches_original: false }).success).toBe(false);
    expect(verifyExtractionRequestSchema.safeParse({ fields, matches_original: true }).success).toBe(true);
  });

  it("rejects a confirmed field with an empty value", () => {
    const fields = initialVerifiedFields(clear);
    fields.frequency = { value: "", state: "confirmed" };
    expect(verifyExtractionRequestSchema.safeParse({ fields, matches_original: true }).success).toBe(false);
  });
});

describe("file validation", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const pdf = new TextEncoder().encode("%PDF-1.7\n...");

  it("sniffs real types from magic bytes", () => {
    expect(sniffMimeType(png)).toBe("image/png");
    expect(sniffMimeType(pdf)).toBe("application/pdf");
    expect(sniffMimeType(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("rejects mismatched declared types, empty and oversized files", () => {
    expect(validateUploadedFile(png, "application/pdf").ok).toBe(false);
    expect(validateUploadedFile(new Uint8Array(), "image/png").ok).toBe(false);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(png);
    expect(validateUploadedFile(big, "image/png").ok).toBe(false);
    expect(validateUploadedFile(png, "image/png")).toEqual({ ok: true, mimeType: "image/png" });
  });
});
