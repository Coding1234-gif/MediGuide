# MediGuide

> Understand your health. Simplify your medicine. Stay on track.

MediGuide turns complicated medicine instructions into **verified, understandable, actionable reminders**, and gives
sourced, limited-scope information about common symptoms. It was built for **LaunchPad Hacks 2026**.

> ⚠️ MediGuide is a hackathon prototype. It does not diagnose, prescribe or replace professional advice, it is not a
> medical device, and it has not been clinically validated. Use only fictional data for demos.

## What it does

| Flow | What happens |
|---|---|
| **Scan** | Upload a photo or PDF of instructions (JPEG/PNG/WebP/PDF, ≤ 4 MB). Content is validated by magic bytes and stored privately. |
| **Extract** | A multimodal model transcribes *only what's written* into structured fields, each with its source text. Output is Zod-validated and normalised. |
| **Verify** | A side-by-side screen shows the original next to each field. The user must explicitly check every field and attest before saving. |
| **Schedule** | A deterministic engine (no LLM) maps verified text to a small set of supported patterns. "As needed", "as directed", missing or contradictory instructions are **blocked**, with guidance to ask a pharmacist. |
| **Remind** | Reminders are stored in UTC, displayed in the user's time zone, de-duplicated, and can be marked done, paused, stopped or exported to a calendar (.ics). |
| **Symptoms** | Fixed red-flag rules run first. Supported symptoms map to curated NHS references with citations. Unsupported input says so instead of guessing. |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Lucide · React Hook Form · Zod 4 ·
Drizzle ORM · Supabase (Postgres, Auth, Storage) · OpenAI Responses API (behind a provider interface) · Vitest ·
React Testing Library · Playwright.

## Quick start (no credentials needed)

Go to https://mediguide-ask-dffe.vercel.app/
**Get started** --> **Scan Instructions**/**Symptom Info**
Test the different features

## Full setup (if needed)

1. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in `DATABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Apply the schema:

   ```bash
   npm run db:migrate
   ```

3. Apply RLS and the private storage bucket: run `supabase/policies/001_rls_and_storage.sql` in the Supabase SQL editor.
4. Add `OPENAI_API_KEY` to enable live extraction.
5. Optional: set `CRON_SECRET`, `RESEND_API_KEY` and `REMINDER_EMAIL_FROM` for email reminders.

See [docs/deployment.md](docs/deployment.md) for Vercel.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `npm run typecheck` | ESLint / Next typegen + `tsc` |
| `npm test` | Unit, integration (real Postgres via PGlite) and evaluation tests |
| `npm run test:e2e` | Playwright E2E (starts its own isolated demo server) |
| `npm run eval` | AI extraction evaluation; `EVAL_LIVE=1` with an API key evaluates the real model |
| `npm run db:generate` / `npm run db:migrate` | Drizzle migrations |
| `npm run samples` | Regenerate the fictional sample labels |

## Project layout

```
src/app/            routes: (marketing), (auth), (dashboard), api/*
src/components/     ui/ (shadcn), layout/, scanner/, verification/, schedules/, reminders/, symptoms/, settings/, shared/
src/features/       service layer (ownership-enforced DB access): document-extraction, instruction-verification,
                    scheduling, reminders, symptom-guidance, profile
src/lib/            ai/ (provider adapters), scheduler/ (deterministic engine), medical/ (references, red flags),
                    validation/ (shared Zod contracts), db/, auth/, storage/, supabase/
src/jobs/           reminder dispatcher
tests/              unit, integration, e2e, evaluation
docs/               architecture, API, data model, AI extraction, medical safety, deployment, demo script
```

## Current limitations

- One medicine per scan. Other medicines on the page are detected and reported, not scheduled.
- Supported frequencies: 1–4 times a day, or every 4/6/8/12/24 hours. Durations: explicit days or weeks (≤ 90), or explicitly ongoing (28-day window).
- Browser notifications only work while the app is open; the email dispatcher needs a scheduler running more often than Vercel Hobby's daily cron (see deployment docs). Calendar export is the fallback.
- Symptom guidance covers 9 common symptoms using curated summaries; it is not a symptom checker.
- Rate limiting is per-instance and in-memory.
- Not clinically validated; evaluation uses synthetic labels only.

## Documentation

[Implementation plan](IMPLEMENTATION_PLAN.md) · [Tasks](TASKS.md) · [Contributing](CONTRIBUTING.md) ·
[Architecture](docs/architecture.md) · [API](docs/api.md) · [Data model](docs/data-model.md) ·
[AI extraction](docs/ai-extraction.md) · [Medical safety](docs/medical-safety.md) ·
[Deployment](docs/deployment.md) · [Demo script](docs/demo-script.md)
