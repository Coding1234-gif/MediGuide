import { formatInTimeZone } from "date-fns-tz";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatLocal } from "@/lib/scheduler/timezone";
import { cn } from "@/lib/utils";
import type { ReminderItem } from "./reminder-list";

/** Seven-day agenda grid. Columns on desktop, stacked days on mobile. */
export function WeekView({ days, timezone, today }: { days: Array<{ date: string; items: ReminderItem[] }>; timezone: string; today: string }) {
  return (
    <ol className="grid gap-3 md:grid-cols-7">
      {days.map(({ date, items }) => {
        const noon = new Date(`${date}T12:00:00Z`);
        const isToday = date === today;
        return (
          <li key={date} className={cn("flex min-h-28 flex-col rounded-xl border bg-card p-3", isToday && "border-primary/50 ring-1 ring-primary/30")}>
            <p className="mb-2 flex items-baseline justify-between gap-1 text-sm md:block">
              <span className="font-semibold">{formatInTimeZone(noon, "UTC", "EEE")}</span>{" "}
              <span className="text-muted-foreground">{formatInTimeZone(noon, "UTC", "d MMM")}</span>
              {isToday ? <span className="ml-1 text-xs font-medium text-primary md:ml-0 md:block">Today</span> : null}
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((r) => (
                  <li key={r.id} className="rounded-lg bg-muted/60 px-2 py-1.5 text-xs">
                    <span className="font-semibold tabular-nums">{formatLocal(r.scheduledAt, timezone, "HH:mm")}</span>{" "}
                    <span className="break-words">{r.medicineName}</span>
                    {r.status === "acknowledged" ? <StatusBadge status="acknowledged" className="mt-1 h-5 text-[10px]" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
