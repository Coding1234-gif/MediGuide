# ADR 0001: Deterministic scheduling from verified text only

**Status:** accepted (2026-10-29)

## Context

LLMs can turn "take one three times a day for a week" into a schedule, but they can also confidently turn "as directed"
or "1–2 tablets when needed" into one, and that output can be steered by text inside the document.

## Decision

The model only transcribes. Scheduling consumes the **user-verified** snapshot and runs a small, explicit regex parser
(`src/lib/scheduler/parse.ts`). Anything outside the supported patterns is refused with a reason. The engine
(`engine.ts`) is pure and deterministic: the same input always produces the same UTC instants.

## Consequences

- Some valid real-world instructions (e.g. "morning and night" without a count) are refused. That's deliberate; each
  new pattern needs a test and a review.
- Prompt injection can't change a schedule unless the user both misses it during verification and it matches a supported pattern.
- The logic is fully unit-testable, including DST.
