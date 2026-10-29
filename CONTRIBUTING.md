# Contributing

Two-person team. Optimise for small PRs, green CI, and never editing the same file at the same time.

## Branches

- `main`: always demoable; protected; deploys to production.
- `dev`: integration branch; deploys to a Vercel preview.
- Feature branches from `dev`: `feature/frontend-*`, `feature/backend-*`, `feature/ai-*`, `feature/scheduling-*`, `fix/*`.

## Commits

Conventional Commits: `feat(scan): …`, `fix(scheduler): …`, `test: …`, `docs: …`, `chore: …`. Imperative, ≤ 72 chars.

## Ownership

| Area | Owner |
|---|---|
| `src/app/(marketing|auth|dashboard)/**`, `src/components/**`, `public/**` | Developer A |
| `src/app/api/**`, `src/features/**`, `src/lib/{ai,db,auth,storage,supabase,scheduler,medical,calendar}/**`, `src/jobs/**`, `drizzle/**`, `supabase/**` | Developer B |
| `src/lib/validation/**` (API contracts), `docs/**`, `tests/e2e/**` | Both. Needs the other person's review. |

Page components may call `src/features/*` read functions directly (Server Components). If you need a new read, ask
the owner or add it in a small, separate PR.

## Pull requests

- Target `dev`. Keep each PR to one concern, ideally under 400 lines of diff.
- Describe what changed, how you tested it, and screenshots for UI changes (desktop and mobile).
- Required CI checks: lint, typecheck, `npm test`, `npm run test:e2e`.
- Safety-relevant changes (parser, schedulability, red flags, prompts, references) need a test and the other developer's review.
- Never commit `.env*` (except `.env.example`), real documents or real health data.

## Reviews

Review within one working session. Check correctness, ownership checks on every query, user-facing copy (calm, no
diagnosis language), accessibility (labels, focus, keyboard) and loading, empty and error states.

## Merge conflicts

Rebase your branch on `dev` before opening the PR. For conflicts in shared contracts, the contract owner of the
change resolves them, then both run `npm run typecheck`. Regenerate migrations (`npm run db:generate`); never hand-merge
`drizzle/migrations/meta`.
