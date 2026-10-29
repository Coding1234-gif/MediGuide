import type { FrequencyPattern } from "./parse";
import { addDaysToIsoDate, zonedWallTimeToUtc } from "./timezone";

/** Ongoing schedules are materialised in rolling windows of this many days. */
export const ONGOING_WINDOW_DAYS = 28;

export type GenerateInput = {
  pattern: FrequencyPattern;
  duration: { kind: "days"; days: number } | { kind: "ongoing" };
  /** Local clock times "HH:MM" chosen by the user. For every_n_hours: exactly one anchor time. */
  times: string[];
  startDate: string; // YYYY-MM-DD, local to `timezone`
  timezone: string;
  /** Instants strictly before this are skipped (e.g. "now" so we don't create past reminders). */
  notBefore?: Date;
};

export type GeneratedPlan = {
  /** Sorted, de-duplicated UTC instants. */
  events: Date[];
  /** Inclusive local end date of the plan. */
  endDate: string;
  /** Local clock times that will repeat each day, in order. */
  dailyTimes: string[];
};

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Expand the pattern into the local clock times for one day. */
export function dailyClockTimes(pattern: FrequencyPattern, times: string[]): string[] {
  if (pattern.kind === "times_per_day") {
    return [...times].sort((a, b) => toMinutes(a) - toMinutes(b));
  }
  // every_n_hours: anchor + k * hours, wrapping within a day. 24 / hours is an integer for supported values.
  const anchor = toMinutes(times[0]);
  const perDay = 24 / pattern.hours;
  const result: string[] = [];
  for (let k = 0; k < perDay; k++) result.push(fromMinutes((anchor + k * pattern.hours * 60) % 1440));
  return result.sort((a, b) => toMinutes(a) - toMinutes(b));
}

/**
 * Deterministically generate reminder instants. Same input ⇒ same output.
 * Local wall-clock times are preserved across DST changes (08:00 stays 08:00 local).
 */
export function generateReminderPlan(input: GenerateInput): GeneratedPlan {
  const days = input.duration.kind === "days" ? input.duration.days : ONGOING_WINDOW_DAYS;
  const dailyTimes = dailyClockTimes(input.pattern, input.times);
  const seen = new Set<number>();
  const events: Date[] = [];

  for (let d = 0; d < days; d++) {
    const date = addDaysToIsoDate(input.startDate, d);
    for (const t of dailyTimes) {
      const instant = zonedWallTimeToUtc(date, t, input.timezone);
      const ms = instant.getTime();
      if (input.notBefore && ms < input.notBefore.getTime()) continue;
      if (seen.has(ms)) continue; // DST fall-back / gap collisions
      seen.add(ms);
      events.push(instant);
    }
  }
  events.sort((a, b) => a.getTime() - b.getTime());
  return { events, endDate: addDaysToIsoDate(input.startDate, days - 1), dailyTimes };
}
