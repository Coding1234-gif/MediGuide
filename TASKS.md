# MediGuide — Tasks

Legend: **A** = Developer A (frontend/UX) · **B** = Developer B (backend/AI/infra) · **A+B** = shared · P0/P1 = priority.
Status reflects what has been implemented **and** run locally (see "Verified" notes).

## Sprint 1 — Foundation & core extraction (Oct 29 – Nov 3)

- [x] P0 · A+B · Scaffold Next.js 16 + TS + Tailwind 4 + shadcn/ui; lint/typecheck scripts
- [x] P0 · B · Env config with integration status (`src/config/env.ts`), `.env.example`
- [x] P0 · B · Drizzle schema + initial migration (7 tables, UUID PKs, FKs, indexes, uniqueness for idempotency)
- [x] P0 · B · PGlite local DB fallback with auto-migrate
- [x] P0 · B · Auth: Supabase SSR clients + proxy refresh; demo sign-in (HMAC cookie) for local/demo
- [x] P0 · B · Private storage abstraction (Supabase bucket / local FS)
- [x] P0 · A+B · Shared Zod contracts: extraction, verification, schedule options, file rules
- [x] P0 · B · Upload API with magic-byte validation, size limit, owner-namespaced paths, rate limit
- [x] P0 · B · AI provider interface, OpenAI adapter (strict JSON schema), fixture provider, Zod re-validation + normalisation
- [x] P0 · A · App shell (sidebar, mobile bottom nav, demo banner), landing page, auth pages
- [x] P0 · A · Scan page: drag-and-drop, camera capture, previews, client pre-checks, sample documents
- [x] P0 · A+B · Fictional sample labels (6 scenarios) + `npm run samples`
- [ ] P0 · B · Create Supabase project, run migrations + `supabase/policies/001_rls_and_storage.sql` — _blocked: needs account_
- [ ] P0 · B · Add `OPENAI_API_KEY`, run `EVAL_LIVE=1 npm run eval`, tune prompt — _blocked: needs key_

## Sprint 2 — Core end-to-end product (Nov 4 – Nov 10)

- [x] P0 · A · Verification screen: split pane / collapsible original, zoom/rotate, per-field evidence, explicit per-field review, attestation, cancel/delete dialogs
- [x] P0 · B · Verify API: stores user snapshot separately; raw extraction immutable; blocks edits under an active schedule
- [x] P0 · B · Deterministic parser + schedulability gate (as needed / as directed / ranges / tapering / contradictions / missing)
- [x] P0 · B · Engine: UTC events, DST-safe wall-clock, de-dupe, notBefore, ongoing 28-day window
- [x] P0 · A · Schedule builder: time pickers, start date, time zone, preview, explicit approval
- [x] P0 · B · Schedule API: preview (dry run), transactional + idempotent create, pause/resume/stop (cancels future events)
- [x] P0 · A · Dashboard, schedules list/detail, reminders (today/week/upcoming/history), mark done/undo
- [x] P0 · B · Reminders API: range/status/pagination; acknowledge window; ownership
- [x] P0 · B · Symptom pipeline: red flags → supported scenarios → curated NHS refs (URLs verified 2026-10-29) → optional AI rephrase with guardrails
- [x] P0 · A · Symptom wizard + results with citations, uncertainty, urgent escalation UI
- [x] P0 · A+B · Unit + integration tests for all of the above

## Sprint 3 — Reliability, polish, safety (Nov 11 – Nov 16)

- [x] P1 · A · Prevention & recovery page (sourced)
- [x] P1 · A+B · Notification prefs, browser test notification, ICS export, email dispatcher with delivery records + retries
- [x] P1 · A · Settings: time zone (auto-detect once), notifications, document deletion, privacy
- [x] P0 · A+B · Playwright E2E 1–5 (desktop + mobile)
- [x] P0 · A+B · AI evaluation harness (fixture mode passing; live pending)
- [x] P0 · A+B · CI workflow (lint, typecheck, tests, E2E)
- [ ] P1 · B · Scheduler for dispatcher more frequent than daily (Trigger.dev or GitHub Actions cron) — see docs/deployment.md
- [ ] P1 · B · Sentry (`@sentry/nextjs`) with PII scrubbing — DSN env already reserved
- [ ] P1 · B · Shared rate limiter (Upstash) if abuse becomes a concern
- [ ] P1 · A · Accessibility pass with axe + keyboard-only walkthrough + screen reader spot check
- [ ] P1 · A · Onboarding walkthrough (P1.4)
- [ ] P1 · A · Visual evidence highlighting on the document (bounding boxes) — needs model coordinates
- [ ] P1 · B · Rolling extension of "ongoing" schedules beyond 28 days (job)
- [ ] P1 · A · PNG app icons (192/512) for PWA install

## Final submission (Nov 17 – Nov 20)

- [ ] A+B · Feature freeze (17 Nov), bug bash on production
- [ ] B · Verify production env vars; run full flow on deployed URL
- [ ] A · Screenshots + 2:30 demo video (docs/demo-script.md)
- [ ] A+B · Devpost write-up: architecture, AI usage, challenges, third-party attributions (NHS content, OpenAI, Supabase, shadcn)
- [ ] A+B · Each teammate confirms eligibility with organisers
- [ ] A+B · Submit before **20 Nov 2026, 5:00 PM EST** (re-verify)
