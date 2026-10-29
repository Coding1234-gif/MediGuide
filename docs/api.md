# API

All endpoints are Next.js route handlers under `/api`. Authentication uses the Supabase session cookie, or the demo
cookie in demo mode. Every endpoint except `/api/auth/demo` and `/api/cron/*` returns `401` when signed out.
Resources owned by another user return **404**, so their existence isn't disclosed.

**Error format** (all non-2xx):

```json
{ "error": { "code": "bad_request", "message": "User-safe text", "details": [{ "path": "times.0", "message": "…" }] } }
```

Codes: `bad_request` 400 · `unauthorized` 401 · `forbidden` 403 · `not_found` 404 · `conflict` 409 · `payload_too_large` 413 ·
`unsupported_media_type` 415 · `unprocessable` 422 · `rate_limited` 429 · `service_unavailable` 503 · `internal` 500.

Request and response types live in `src/lib/validation/*`, `src/lib/scheduler/validation.ts` and the feature services.

## Documents

| Method & path | Body | Success |
|---|---|---|
| `POST /api/documents/upload` | `multipart/form-data` with `file` (JPEG/PNG/WebP/PDF, ≤ 4 MB) | `201 { document: { id, fileType, fileSize, extractionStatus, createdAt } }` |
| `POST /api/documents/:id/extract` | — | `200 { extraction: { id, documentId, modelIdentifier, live, result: ExtractionResult, createdAt } }` |
| `GET /api/documents/:id/file` | — | original bytes, `Cache-Control: private, no-store` |
| `DELETE /api/documents/:id` | — | `204`; the file is removed from storage and the row is soft-deleted |

Extract errors: `409` already processing · `422` provider/validation failure (`details.retryable`, `details.reason`) ·
`503` AI not configured (fixture mode with a non-sample file). Rate limits: 20 uploads/hour, 15 extractions/hour per user.

## Verification

`PATCH /api/extractions/:id/verify`

```json
{ "fields": { "<field>": { "value": "string|null", "state": "confirmed|corrected|missing|unclear" } }, "matches_original": true }
```

Fields: `medicine_name, strength, dose_amount, route, frequency, timing_instructions, duration, special_conditions`.
Returns `{ extraction: { id, validationStatus, verifiedAt }, schedulability }`, where `schedulability` is either
`{ schedulable: true, pattern, duration, timesRequired, notes }` or `{ schedulable: false, reasons: [{ field, message }] }`.
Returns `409` if an active schedule already uses the extraction.

## Schedules

| Method & path | Body | Success |
|---|---|---|
| `POST /api/schedules/preview` | `{ extractionId, times: ["HH:MM"], startDate: "YYYY-MM-DD", timezone }` | `{ preview: { confirmed, endDate, totalReminders, firstReminders[] } }` (nothing saved) |
| `POST /api/schedules` | preview body + `approved: true` | `201 { schedule, created: true }`, or `200 { schedule, created: false }` if it already exists (idempotent) |
| `GET /api/schedules` | — | `{ schedules: [...] }` with `nextAt`, `total`, `acknowledged` |
| `GET /api/schedules/:id` | — | `{ schedule, events }` |
| `PATCH /api/schedules/:id` | `{ status: "active" \| "paused" \| "cancelled" }` | `{ schedule }`; cancelling cancels future events |

`422` (with `details.reasons`) means the instructions aren't schedulable. `400` means the times don't match the pattern.

## Reminders

- `GET /api/reminders?from&to&status&scheduleId&order=asc|desc&limit≤200&offset` returns `{ items, hasMore, nextOffset }`.
- `PATCH /api/reminders/:id` with `{ action: "acknowledge" | "undo" }` returns `{ reminder }`. Acknowledging is allowed from 2 h before the due time; cancelled reminders return `409`.

## Symptoms

`POST /api/symptoms/analyze`

```json
{ "symptoms": ["cough"], "description": "", "duration": "lt_2_days|2_7_days|1_3_weeks|gt_3_weeks", "redFlagAnswers": ["breathing"], "vulnerableGroup": false }
```

Returns `{ result: { status: emergency|urgent|seek_advice|routine|unsupported, safety, matchedSymptoms, overview, references[], selfCare[], seekAdviceIf[], prevention[], adviceReasons[] } }`.

## Settings & notifications

- `GET|PATCH /api/settings`, with PATCH body `{ timezone }` (an IANA zone)
- `GET|PUT /api/notifications/preferences`, with PUT body `{ email: boolean, browser: boolean }`
- `GET /api/calendar?scheduleId=` returns a `.ics` file of upcoming reminders

## Auth (demo) & jobs

- `POST /api/auth/demo` `{ userId }` / `DELETE /api/auth/demo` (only when demo mode is enabled)
- `GET /api/cron/dispatch-reminders` with `Authorization: Bearer $CRON_SECRET` returns `{ considered, sent, skipped, failed }`
