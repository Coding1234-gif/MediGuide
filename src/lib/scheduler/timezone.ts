import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a local wall-clock date + time in `timeZone` to a UTC instant.
 * Non-existent local times (DST spring-forward gap) are shifted forward by the gap,
 * matching how most calendar apps behave.
 */
export function zonedWallTimeToUtc(isoDate: string, clockTime: string, timeZone: string): Date {
  const utc = fromZonedTime(`${isoDate}T${clockTime}:00`, timeZone);
  // If the wall time doesn't exist, formatting back gives a different local time — accept the shift.
  return utc;
}

export function localDateInZone(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatLocal(instant: Date | string, timeZone: string, pattern = "EEE d MMM, HH:mm"): string {
  return formatInTimeZone(typeof instant === "string" ? new Date(instant) : instant, timeZone, pattern);
}
