# Medical safety boundaries

MediGuide provides **transcription, organisation and general information**. It never diagnoses, prescribes, chooses
doses or intervals, or claims clinical validation. Safety is enforced in code, not only in disclaimers.

## Instruction → schedule safeguards

| Safeguard | Where |
|---|---|
| Model may only transcribe; it must never infer, calculate or fill gaps | `src/lib/ai/schemas.ts` system prompt |
| Output is schema-validated and normalised (no evidence means it needs verification) | `normalizeExtraction` |
| Every field needs explicit user review, plus an attestation checkbox, before saving | `verification-workspace.tsx`; server requires `matches_original: true` |
| Raw AI output is immutable; user corrections are stored separately | `extractions.extracted_fields` vs `verified_fields` |
| Scheduling uses **only** verified fields, through a deterministic parser | `src/lib/scheduler/{parse,validation}.ts` |
| Blocked: as needed/PRN, as directed, up to/max, ranges ("one or two"), tapering/"then", contradictory frequencies, every-12-hours vs twice-a-day mismatches, unsupported intervals, missing/unclear dose/frequency/duration, vague durations ("until finished"), courses > 90 days | `parse.ts` |
| User chooses clock times; MediGuide only spaces doses when an explicit hourly interval is written | `schedule-builder.tsx`, `engine.ts` |
| Preview + explicit approval before creating; server re-validates everything | `/api/schedules/preview`, `createScheduleRequestSchema` |
| Blocked output always says to clarify with a pharmacist or prescriber; no guessed alternative is offered | verification UI |
| "Done" is labelled as a personal note, not a medical record | reminders UI |
| Reminder emails contain no medicine names | `src/jobs/send-reminder.ts` |

## Symptom information safeguards

1. **Red flags first, without a model:** keyword and structured-question rules (`src/lib/medical/safety.ts`) for breathing, chest pain, stroke signs, collapse/seizure/confusion, severe bleeding, meningitis signs, anaphylaxis, self-harm, dehydration and thunderclap headache. On a match, general information is suppressed and emergency guidance is shown.
2. **Limited scope:** 9 supported symptoms (`supported-scenarios.ts`). Anything else gets an explicit "we don't have reliable information".
3. **Curated references only:** NHS pages, with URLs and "last reviewed" dates checked on 2026-10-29, and short original summaries. No NHS API is used; we don't claim one exists.
4. **Optional AI rephrase:** constrained to the retrieved summaries. Output containing diagnostic phrasing, doses or percentages is discarded in favour of the curated text.
5. **Language:** "possibilities the sources describe", "MediGuide can't tell which, if any, applies to you", "isn't a diagnosis".

## Reviewing changes

Any change to `parse.ts`, `validation.ts`, `safety.ts`, `references.ts` or the prompts needs a unit test and review by
the other developer. Emergency numbers vary by country; the UI names 999/911/112, and the call button targets 999 (UK).

## Not claimed

No regulatory compliance, certification or clinical approval. Use fictional documents only for demos.
