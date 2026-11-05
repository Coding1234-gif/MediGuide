import { z } from "zod";
import {
  FIELD_LABELS,
  SCHEDULE_REQUIRED_FIELDS,
  type VerifiedFields,
} from "@/lib/validation/extraction";
import { detectNonRoutine, parseDuration, parseFrequency, remindersPerDay, type FrequencyPattern } from "./parse";
import { isValidTimeZone } from "./timezone";

export type BlockReason = { field: string; message: string };

export type Schedulability =
  | {
      schedulable: true;
      pattern: FrequencyPattern;
      duration: { kind: "days"; days: number } | { kind: "ongoing" };
      /** Number of clock times the user must choose (per day). */
      timesRequired: number;
      notes: string[];
    }
  | { schedulable: false; reasons: BlockReason[] };

/**
 * Decide — deterministically — whether verified instructions can become a routine
 * reminder schedule. Any doubt results in `schedulable: false`.
 */
export function assessSchedulability(fields: VerifiedFields): Schedulability {
  const reasons: BlockReason[] = [];

  for (const key of SCHEDULE_REQUIRED_FIELDS) {
    const f = fields[key];
    if (f.state === "missing" || !f.value) {
      reasons.push({ field: key, message: `${FIELD_LABELS[key]} is missing from the instructions.` });
    } else if (f.state === "unclear") {
      reasons.push({ field: key, message: `${FIELD_LABELS[key]} was marked as unclear.` });
    }
  }
  if (fields.timing_instructions.state === "unclear") {
    reasons.push({ field: "timing_instructions", message: "Timing instructions were marked as unclear." });
  }

  const dose = fields.dose_amount.value;
  if (dose) {
    const nonRoutine = detectNonRoutine(dose);
    if (nonRoutine) reasons.push({ field: "dose_amount", message: nonRoutine });
  }

  let pattern: FrequencyPattern | null = null;
  if (fields.frequency.value && fields.frequency.state !== "unclear") {
    // Conflicting frequencies can end up in any free-text field, so check timing and special conditions together.
    const timing =
      [fields.timing_instructions, fields.special_conditions]
        .filter((f) => f.state !== "missing" && f.value)
        .map((f) => f.value)
        .join(" | ") || null;
    const parsed = parseFrequency(fields.frequency.value, timing);
    if (parsed.kind === "unsupported") reasons.push({ field: "frequency", message: parsed.reason });
    else pattern = parsed;
  }

  let duration: { kind: "days"; days: number } | { kind: "ongoing" } | null = null;
  if (fields.duration.value && fields.duration.state !== "unclear") {
    const parsed = parseDuration(fields.duration.value);
    if (parsed.kind === "unsupported") reasons.push({ field: "duration", message: parsed.reason });
    else duration = parsed;
  }

  if (reasons.length > 0 || !pattern || !duration) {
    return { schedulable: false, reasons: dedupe(reasons) };
  }

  const notes: string[] = [];
  if (fields.timing_instructions.value) notes.push(fields.timing_instructions.value);
  if (fields.special_conditions.value) notes.push(fields.special_conditions.value);

  return {
    schedulable: true,
    pattern,
    duration,
    timesRequired: pattern.kind === "times_per_day" ? pattern.count : 1,
    notes,
  };
}

function dedupe(reasons: BlockReason[]): BlockReason[] {
  const seen = new Set<string>();
  return reasons.filter((r) => {
    const k = `${r.field}:${r.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------------------
// User-selected schedule options
// ---------------------------------------------------------------------------

export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM format.");
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export const scheduleOptionsSchema = z.object({
  times: z.array(clockTimeSchema).min(1).max(6),
  startDate: isoDateSchema,
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone."),
});
export type ScheduleOptions = z.infer<typeof scheduleOptionsSchema>;

export const createScheduleRequestSchema = scheduleOptionsSchema.extend({
  extractionId: z.uuid(),
  /** Explicit approval of the generated reminder preview. */
  approved: z.literal(true, { error: "Please approve the reminder schedule before creating it." }),
});
export type CreateScheduleRequest = z.infer<typeof createScheduleRequestSchema>;

/** Validate user-chosen clock times against the parsed pattern. Returns error messages. */
export function validateChosenTimes(pattern: FrequencyPattern, times: string[]): string[] {
  const errors: string[] = [];
  const unique = new Set(times);
  if (unique.size !== times.length) errors.push("Each reminder time must be different.");
  if (pattern.kind === "times_per_day" && times.length !== pattern.count) {
    errors.push(`These instructions need exactly ${pattern.count} reminder time${pattern.count > 1 ? "s" : ""} per day.`);
  }
  if (pattern.kind === "every_n_hours" && times.length !== 1) {
    errors.push(`Choose one first reminder time; later reminders follow every ${pattern.hours} hours as written.`);
  }
  return errors;
}

export { remindersPerDay };
