# MediGuide — Implementation Plan

_Last updated: 2026-10-29. Submission target: **20 Nov 2026, 5:00 PM EST**. Re-verify the deadline, rules, judging criteria
and age-eligibility on https://launchpad-hacks.devpost.com/; both teammates must confirm their own eligibility._

## 1. Goal

A polished, reliable MVP where users turn medicine instructions into **verified** reminder schedules, supported by
sourced health information. Judging (to re-verify): innovation, usefulness, implementation, design. Each is served by
the same thing: one complete, safe vertical slice demoed end to end.

## 2. Architecture (summary — see docs/architecture.md)

- **Next.js 16 App Router** monolith on Vercel. Server Components read through a **service layer** (`src/features/*`)
  that enforces ownership in every query. Client components mutate through typed **route handlers** (`src/app/api/*`).
- **Shared contracts** in `src/lib/validation` (Zod) are imported by both UI and API, so they're the hand-off point between the two developers.
- **Postgres via Drizzle**: Supabase in production; PGlite locally and in tests (same SQL migrations).
- **AI behind adapters** (`InstructionExtractionProvider`): OpenAI Responses API with strict JSON schema; a fixture provider for credential-free demos/tests.
- **Deterministic scheduler** (`src/lib/scheduler`): regex parsers → supported pattern or explicit refusal → UTC event generation that is DST-safe and idempotent.
- **Safety in code**: red-flag rules, schedulability gate, verification attestation, immutable raw extraction.

## 3. Key technical decisions

| Decision | Why |
|---|---|
| `cacheComponents` disabled | Every app page is per-user and dynamic. Cache Components adds Suspense and caching rules with no benefit here. |
| Proxy (`src/proxy.ts`) is optimistic only | Next 16 guidance: real auth checks live in pages/handlers (`requireUserOrRedirect`, `requireApiUser`). |
| Server-side multipart upload (≤ 4 MB) instead of signed client uploads | Lets us validate magic bytes before storing. Fits under Vercel's 4.5 MB body limit. |
| PGlite fallback | Run, demo and integration-test real SQL with zero setup. Same migrations as Supabase. |
| Fixture provider refuses unknown files | Never fabricates output; fixtures are clearly labelled. |
| Base UI flavour of shadcn | Current `shadcn init` default; uses `render` prop instead of `asChild`. |
| Native `<select>`/radio for key inputs | Accessible and mobile-friendly by default; fewer moving parts. |
| Reminder dispatcher as idempotent HTTP job | Runs from Vercel Cron, Trigger.dev or any scheduler. Unique (event, channel) prevents double sends. |

## 4. Milestones & critical path

1. **Foundation** ✅ — scaffold, config, schema + migrations, auth (Supabase + demo), storage, Zod contracts, app shell.
2. **Vertical slice** ✅ — upload → extract → verify → schedulability → preview/approve → schedule + events → reminders UI.
3. **Supporting** ✅ (MVP level) — symptom wizard + red flags + curated references; prevention page; notification prefs, test notification, ICS export, dispatcher.
4. **Reliability** 🔄 — tests (unit/integration/component/E2E/eval ✅), live-AI evaluation ⏳, Supabase deploy ⏳, Sentry ⏳, accessibility audit ⏳, demo assets ⏳.

Critical path from here: **Supabase project → live OpenAI key → run `EVAL_LIVE=1 npm run eval` → Vercel deploy → demo recording.**

## 5. Known risks

| Risk | Mitigation |
|---|---|
| Model misreads labels | Mandatory per-field verification with evidence. Deterministic gate. Eval harness on samples. |
| Prompt injection in documents | System prompt treats the document as data; strict schema; `suspicious_content_detected` surfaced to user; scheduler never trusts model output. Covered by a sample. |
| Over-blocking real instructions (regex parser too strict) | Prefer safety; extend patterns with tests; failure message directs user to pharmacist. |
| Vercel Hobby cron is daily only | Use Trigger.dev / GitHub Actions / Supabase pg_cron hitting the dispatch endpoint; ICS export fallback. |
| PGlite on Vercel (read-only FS) | `DATABASE_URL` required for deployment; documented. |
| Age/eligibility rules | Each teammate verifies independently with organisers. |
| Scope creep | P1 only after P0 is stable; feature freeze 17 Nov. |

## 6. Acceptance criteria (status)

| Scenario | Status | Evidence |
|---|---|---|
| A — clear instructions → schedule | ✅ | `tests/integration/scan-to-schedule.test.ts`, `tests/e2e/scan-to-schedule.spec.ts` |
| B — missing frequency blocked | ✅ | integration + `schedulability.test.ts` |
| C — unclear document blocked | ✅ | integration (`blurry-label`) |
| D — "as directed" blocked | ✅ | integration + `tests/e2e/safety.spec.ts` |
| E — cross-user access denied | ✅ | integration + E2E |
| F — UTC storage, local display, no dupes, DST | ✅ | `scheduler-engine.test.ts`, idempotency test |
| G — symptom info cited, no diagnosis | ✅ | E2E + `medical-safety.test.ts` |
| Live AI extraction quality | ⏳ | needs `OPENAI_API_KEY`; run `EVAL_LIVE=1 npm run eval` |
| Production deployment | ⏳ | needs Supabase + Vercel |

## 7. Parallel work split

See [TASKS.md](TASKS.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Developer A owns `src/app/(…)` pages and `src/components/**`.
Developer B owns `src/lib/**` (except `lib/validation`, shared), `src/features/**`, `src/app/api/**`, `src/jobs`,
`drizzle/`, `supabase/`. Changes to `src/lib/validation/**` need both reviewers.
