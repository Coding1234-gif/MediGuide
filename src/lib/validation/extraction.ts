import { z } from "zod";

/**
 * Shared contract for AI instruction extraction and user verification.
 * Both frontend and backend import from here — change with care.
 */

export const FIELD_STATUSES = ["extracted", "missing", "unclear", "needs_verification"] as const;
export const fieldStatusSchema = z.enum(FIELD_STATUSES);
export type FieldStatus = z.infer<typeof fieldStatusSchema>;

export const EXTRACTION_FIELD_KEYS = [
  "medicine_name",
  "strength",
  "dose_amount",
  "route",
  "frequency",
  "timing_instructions",
  "duration",
  "special_conditions",
] as const;
export const extractionFieldKeySchema = z.enum(EXTRACTION_FIELD_KEYS);
export type ExtractionFieldKey = z.infer<typeof extractionFieldKeySchema>;

export const FIELD_LABELS: Record<ExtractionFieldKey, string> = {
  medicine_name: "Medicine name",
  strength: "Strength",
  dose_amount: "Amount per dose",
  route: "How to take it",
  frequency: "How often",
  timing_instructions: "When to take it",
  duration: "How long",
  special_conditions: "Special conditions",
};

/** Fields that must be present and confirmed before any schedule can be generated. */
export const SCHEDULE_REQUIRED_FIELDS: readonly ExtractionFieldKey[] = [
  "medicine_name",
  "dose_amount",
  "frequency",
  "duration",
];

const text = z.string().trim().max(2000);

export const extractedFieldSchema = z.object({
  value: text.nullable(),
  source_text: text.nullable(),
  status: fieldStatusSchema,
  page: z.number().int().min(1).max(200).nullable().default(null),
});
export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const extractionFieldsSchema = z.object(
  Object.fromEntries(EXTRACTION_FIELD_KEYS.map((k) => [k, extractedFieldSchema])) as Record<
    ExtractionFieldKey,
    typeof extractedFieldSchema
  >,
);

export const extractionWarningSchema = z.object({
  text: text.min(1),
  source_text: text.nullable(),
  page: z.number().int().min(1).max(200).nullable().default(null),
});

export const DOCUMENT_TYPES = ["medicine_instructions", "unrelated", "unreadable"] as const;

export const extractionResultSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  fields: extractionFieldsSchema,
  warnings: z.array(extractionWarningSchema).max(30),
  other_guidance: z.array(extractionWarningSchema).max(30).default([]),
  /** Other medicines found on the same document; MVP schedules one medicine per extraction. */
  additional_medicines_detected: z.array(text).max(10).default([]),
  /** Text in the document that looked like instructions aimed at software (prompt-injection). */
  suspicious_content_detected: z.boolean().default(false),
  requires_user_verification: z.literal(true),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

/**
 * Post-validation normalisation. The model is untrusted; enforce invariants it may violate:
 * - a field with no value can never be "extracted"
 * - an "extracted" value must be backed by source text, otherwise it needs verification
 */
export function normalizeExtraction(result: ExtractionResult): ExtractionResult {
  const fields = { ...result.fields };
  for (const key of EXTRACTION_FIELD_KEYS) {
    const f = { ...fields[key] };
    if (f.value !== null && f.value.trim() === "") f.value = null;
    if (f.source_text !== null && f.source_text.trim() === "") f.source_text = null;
    if (f.value === null && f.status === "extracted") f.status = "missing";
    if (f.value !== null && f.source_text === null && f.status === "extracted") {
      f.status = "needs_verification";
    }
    fields[key] = f;
  }
  return { ...result, fields, requires_user_verification: true };
}

// ---------------------------------------------------------------------------
// Verification (user-confirmed snapshot; stored separately from raw extraction)
// ---------------------------------------------------------------------------

export const VERIFIED_FIELD_STATES = ["confirmed", "corrected", "missing", "unclear"] as const;
export const verifiedFieldStateSchema = z.enum(VERIFIED_FIELD_STATES);
export type VerifiedFieldState = z.infer<typeof verifiedFieldStateSchema>;

export const verifiedFieldSchema = z
  .object({
    value: text.nullable(),
    state: verifiedFieldStateSchema,
  })
  .superRefine((f, ctx) => {
    if ((f.state === "confirmed" || f.state === "corrected") && !f.value) {
      ctx.addIssue({ code: "custom", message: "A confirmed field needs a value.", path: ["value"] });
    }
  });
export type VerifiedField = z.infer<typeof verifiedFieldSchema>;

export const verifiedFieldsSchema = z.object(
  Object.fromEntries(EXTRACTION_FIELD_KEYS.map((k) => [k, verifiedFieldSchema])) as Record<
    ExtractionFieldKey,
    typeof verifiedFieldSchema
  >,
);
export type VerifiedFields = z.infer<typeof verifiedFieldsSchema>;

export const verifyExtractionRequestSchema = z.object({
  fields: verifiedFieldsSchema,
  /** User explicitly attests that they compared each field with the original document. */
  matches_original: z.literal(true, {
    error: "Please confirm you compared the details with your original instructions.",
  }),
});
export type VerifyExtractionRequest = z.infer<typeof verifyExtractionRequestSchema>;

/** Build the initial verification form state from a raw extraction. */
export function initialVerifiedFields(result: ExtractionResult): VerifiedFields {
  return Object.fromEntries(
    EXTRACTION_FIELD_KEYS.map((k) => {
      const f = result.fields[k];
      const state: VerifiedFieldState =
        f.value === null ? (f.status === "unclear" ? "unclear" : "missing") : f.status === "unclear" ? "unclear" : "confirmed";
      return [k, { value: f.value, state }];
    }),
  ) as VerifiedFields;
}
