"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pill, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import { formatLocal } from "@/lib/scheduler/timezone";
import { cn } from "@/lib/utils";

export type ReminderItem = {
  id: string;
  scheduleId: string;
  scheduledAt: string;
  status: "scheduled" | "delivered" | "acknowledged" | "missed" | "cancelled";
  medicineName: string;
  doseAmount: string;
  timingInstructions: string | null;
  scheduleStatus: string;
};

const ACK_WINDOW_MS = 2 * 3600 * 1000;

export function ReminderList({
  items,
  timezone,
  timeFormat = "HH:mm",
  showSchedule = true,
  emptyText,
}: {
  items: ReminderItem[];
  timezone: string;
  timeFormat?: string;
  showSchedule?: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, ReminderItem["status"]>>({});
  // Captured once per mount; the list re-renders via router.refresh() after changes.
  const [now] = useState(() => Date.now());

  async function act(item: ReminderItem, action: "acknowledge" | "undo") {
    setPending(item.id);
    try {
      const { reminder } = await apiFetch<{ reminder: { status: ReminderItem["status"] } }>(`/api/reminders/${item.id}`, {
        method: "PATCH",
        json: { action },
      });
      setLocal((s) => ({ ...s, [item.id]: reminder.status }));
      if (action === "acknowledge") toast.success("Marked as done", { description: `${item.medicineName} · ${formatLocal(item.scheduledAt, timezone, "HH:mm")}` });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't update the reminder.");
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyText ?? "No reminders."}</p>;

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => {
        const raw = local[item.id] ?? item.status;
        // Without a dispatcher run, past reminders stay "scheduled"; show them as not marked.
        const status = raw === "scheduled" && new Date(item.scheduledAt).getTime() < now - 3600 * 1000 ? "missed" : raw;
        const done = status === "acknowledged";
        const canAck = !done && status !== "cancelled" && item.scheduleStatus !== "cancelled" && new Date(item.scheduledAt).getTime() <= now + ACK_WINDOW_MS;
        return (
          <li key={item.id} className={cn("flex items-center gap-3 p-3 sm:p-4", done && "bg-success-soft/40")}>
            <div className="w-14 shrink-0 text-center">
              <p className="text-base font-semibold tabular-nums">{formatLocal(item.scheduledAt, timezone, "HH:mm")}</p>
              {timeFormat !== "HH:mm" ? <p className="text-[11px] text-muted-foreground">{formatLocal(item.scheduledAt, timezone, "EEE d MMM")}</p> : null}
            </div>
            <Pill className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", done && "text-muted-foreground line-through decoration-1")}>{item.medicineName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {item.doseAmount}
                {item.timingInstructions ? ` · ${item.timingInstructions}` : ""}
                {showSchedule ? (
                  <>
                    {" · "}
                    <Link href={`/schedules/${item.scheduleId}`} className="underline-offset-2 hover:underline">
                      schedule
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <StatusBadge status={status} className="hidden sm:inline-flex" />
            {done ? (
              <Button variant="ghost" size="sm" onClick={() => act(item, "undo")} disabled={pending === item.id} aria-label={`Undo done for ${item.medicineName} at ${formatLocal(item.scheduledAt, timezone, "HH:mm")}`}>
                {pending === item.id ? <Loader2 className="animate-spin" /> : <Undo2 />}
                <span className="hidden sm:inline">Undo</span>
              </Button>
            ) : canAck ? (
              <Button size="sm" onClick={() => act(item, "acknowledge")} disabled={pending === item.id} aria-label={`Mark ${item.medicineName} at ${formatLocal(item.scheduledAt, timezone, "HH:mm")} as done`}>
                {pending === item.id ? <Loader2 className="animate-spin" /> : <Check />}
                Done
              </Button>
            ) : (
              <StatusBadge status={status} className="sm:hidden" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
