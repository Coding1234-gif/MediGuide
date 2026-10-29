"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch, ClientApiError } from "@/lib/api-client";

export function ScheduleControls({ scheduleId, status }: { scheduleId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(next: "active" | "paused" | "cancelled") {
    setBusy(next);
    try {
      await apiFetch(`/api/schedules/${scheduleId}`, { method: "PATCH", json: { status: next } });
      toast.success(next === "cancelled" ? "Schedule stopped. Future reminders were removed." : next === "paused" ? "Schedule paused." : "Schedule resumed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't update the schedule.");
    } finally {
      setBusy(null);
    }
  }

  const live = status === "active" || status === "paused";
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "cancelled" ? (
        <a href={`/api/calendar?scheduleId=${scheduleId}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted" download>
          <CalendarPlus className="size-4" aria-hidden="true" /> Add to calendar (.ics)
        </a>
      ) : null}
      {status === "active" ? (
        <Button variant="outline" onClick={() => setStatus("paused")} disabled={busy !== null}>
          {busy === "paused" ? <Loader2 className="animate-spin" /> : <Pause aria-hidden="true" />} Pause
        </Button>
      ) : null}
      {status === "paused" ? (
        <Button variant="outline" onClick={() => setStatus("active")} disabled={busy !== null}>
          {busy === "active" ? <Loader2 className="animate-spin" /> : <Play aria-hidden="true" />} Resume
        </Button>
      ) : null}
      {live ? (
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" disabled={busy !== null} />}>
            <Square aria-hidden="true" /> Stop schedule
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop this schedule?</AlertDialogTitle>
              <AlertDialogDescription>
                All future reminders will be removed. Past reminders stay in your history. Only stop a medicine early if your pharmacist
                or prescriber has advised you to — this only affects reminders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => setStatus("cancelled")}>
                Stop schedule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
