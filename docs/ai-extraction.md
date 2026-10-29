# AI instruction extraction

## Flow

`extractDocument` (src/features/document-extraction/service.ts) → `runInstructionExtraction` (src/lib/ai/extraction.ts) →
provider `extract()` → `extractionResultSchema.safeParse` → `normalizeExtraction` → immutable insert.

## Providers

| Provider | When | Output label |
|---|---|---|
| `OpenAIExtractionProvider` | `OPENAI_API_KEY` set | `openai:<AI_EXTRACTION_MODEL>`, "Read by AI" in UI |
| `FixtureExtractionProvider` | no key | `fixture:<sample-id>`, "Pre-written sample result (fixture)" in UI |

The OpenAI adapter uses the Responses API with images as `input_image` data URLs and PDFs as `input_file`, plus
`text.format = json_schema` in **strict** mode (`src/lib/ai/schemas.ts`). Timeouts (60 s), 429 and 5xx errors are
mapped to retryable errors. The fixture provider matches the upload's SHA-256 against the bundled samples and
**refuses every other file**. It never invents output.

## Schema

Each field (`medicine_name, strength, dose_amount, route, frequency, timing_instructions, duration, special_conditions`) is
`{ value, source_text, status: extracted|missing|unclear|needs_verification, page }`, plus `warnings[]`, `other_guidance[]`,
`additional_medicines_detected[]`, `suspicious_content_detected`, `document_type`, and `requires_user_verification: true`.

`normalizeExtraction` enforces invariants the model might break:

- An empty value can't be `extracted`; it becomes `missing`.
- A value with no `source_text` can't be `extracted`; it becomes `needs_verification`.

## Prompt-injection protections

1. The system prompt states that the document is untrusted data and that embedded instructions must be ignored and flagged.
2. Strict JSON schema: the model can only fill fixed fields and has no tools or actions.
3. Zod re-validation on the server, and output never reaches the scheduler directly.
4. Only the *user-verified* snapshot feeds `assessSchedulability`, a regex-based gate with no model in the loop.
5. `suspicious_content_detected` is shown to the user as a warning.
6. The fictional sample `prompt-injection.png` exercises this. Its expected result keeps the label's real frequency and ignores the injected "every 2 hours".

## Evaluation

`tests/evaluation/extraction-eval.test.ts` reports field accuracy, false-extraction rate (values invented where ground truth is
null), missing-field detection, and unsafe schedules (a sample that should be blocked but became schedulable).
With fixtures it validates the harness. Set `EVAL_LIVE=1` with an API key to measure the real model. These are synthetic
labels, so the results say nothing about clinical effectiveness.

## Limitations

- One medicine per extraction. Handwriting and very low-quality photos will often be marked `unclear`, which is the intended behaviour.
- Page numbers are recorded, but there are no bounding boxes yet, so on-image highlighting is P1.
- Documents are sent to OpenAI when live AI is enabled. This is disclosed in Settings, and we should check the account's data-retention settings.
