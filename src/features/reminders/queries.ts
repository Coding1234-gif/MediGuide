import { addDaysToIsoDate, localDateInZone, zonedWallTimeToUtc } from "@/lib/scheduler/timezone";
import { listReminders, type ReminderView } from "./service";
import type { ReminderItem } from "@/components/reminders/reminder-list";

/** Serialise for client components. */
export function toItem(r: ReminderView): ReminderItem {
  return { ...r, scheduledAt: r.scheduledAt.toISOString() };
}

/** UTC bounds of the user's local calendar day (handles DST-length days). */
export function localDayBounds(timezone: string, offsetDays = 0, now = new Date()) {
  const date = addDaysToIsoDate(localDateInZone(now, timezone), offsetDays);
  return {
    date,
    from: zonedWallTimeToUtc(date, "00:00", timezone),
    to: zonedWallTimeToUtc(addDaysToIsoDate(date, 1), "00:00", timezone),
  };
}

export async function remindersForLocalDay(userId: string, timezone: string, offsetDays = 0) {
  const { from, to } = localDayBounds(timezone, offsetDays);
  const { items } = await listReminders(userId, { from: from.toISOString(), to: to.toISOString(), order: "asc", limit: 100, offset: 0 });
  return items.filter((r) => r.status !== "cancelled").map(toItem);
}
