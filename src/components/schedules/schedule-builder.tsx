"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/shared/notice";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import { dailyClockTimes } from "@/lib/scheduler/engine";
import { describeFrequency, type FrequencyPattern } from "@/lib/scheduler/parse";
import { formatLocal } from "@/lib/scheduler/timezone";
import { TimezoneSelect } from "@/components/shared/timezone-select";

/** Placeholder starting points the user is asked to adjust — not clinical advice about timing. */
const STARTING_TIMES: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

type Preview = {
  confirmed: { medicineName: string; doseAmount: string; frequencySummary: string; timingInstructions: string | null; dailyTimes: string[]; ongoing: boolean };
  endDate: string;
  totalReminders: number;
  firstReminders: string[];
};

function todayIn(tz: string) {
  return formatLocal(new Date(), tz, "yyyy-MM-dd");
}

export function ScheduleBuilder({
  extractionId,
  pattern,
  durationLabel,
  notes,
  defaultTimezone,
}: {
  extractionId: string;
  pattern: FrequencyPattern;
  durationLabel: string;
  notes: string[];
  defaultTimezone: string;
}) {
  const router = useRouter();
  const count = pattern.kind === "times_per_day" ? pattern.count : 1;
  const [times, setTimes] = useState<string[]>(STARTING_TIMES[count] ?? ["08:00"]);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [startDate, setStartDate] = useState(() => todayIn(defaultTimezone));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState<"preview" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expanded = useMemo(() => (times.every(Boolean) ? dailyClockTimes(pattern, times) : []), [pattern, times]);
  const duplicate = new Set(times).size !== times.length;

  function invalidate() {
    setPreview(null);
    setApproved(false);
  }

  async function loadPreview() {
    setBusy("preview");
    setError(null);
    try {
      const { preview } = await apiFetch<{ preview: Preview }>("/api/schedules/preview", {
        method: "POST",
        json: { extractionId, times, startDate, timezone },
      });
      setPreview(preview);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't build the preview.");
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    setBusy("create");
    setError(null);
    try {
      const { schedule } = await apiFetch<{ schedule: { id: string } }>("/api/schedules", {
        method: "POST",
        json: { extractionId, times, startDate, timezone, approved: true },
      });
      toast.success("Reminder schedule created.");
      router.push(`/schedules/${schedule.id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't create the schedule.");
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="builder-title" className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="space-y-1">
        <h2 id="builder-title" className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="size-5 text-primary" aria-hidden="true" /> Set up reminders
        </h2>
        <p className="text-sm text-muted-foreground">
          Your verified instructions say <strong className="text-foreground">{describeFrequency(pattern).toLowerCase()}</strong>,{" "}
          <strong className="text-foreground">{durationLabel.toLowerCase()}</strong>. Choose times that fit your day and any timing written on
          your instructions.
        </p>
      </div>

      {notes.length > 0 ? (
        <Notice tone="info" title="Written on your instructions">
          <ul className="list-disc pl-4">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{pattern.kind === "every_n_hours" ? "First reminder of the day" : `Reminder times (${count})`}</legend>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <Input
                key={i}
                type="time"
                value={t}
                required
                aria-label={`Reminder time ${i + 1}`}
                onChange={(e) => {
                  const next = [...times];
                  next[i] = e.target.value;
                  setTimes(next);
                  invalidate();
                }}
                className="h-10 w-32 text-base"
              />
            ))}
          </div>
          {pattern.kind === "every_n_hours" && expanded.length > 0 ? (
            <p className="text-xs text-muted-foreground">Every {pattern.hours} hours as written: {expanded.join(", ")}</p>
          ) : null}
          {duplicate ? <p className="text-xs font-medium text-destructive">Each time must be different.</p> : null}
        </fieldset>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              min={todayIn(timezone)}
              onChange={(e) => {
                setStartDate(e.target.value);
                invalidate();
              }}
              className="h-10 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tz">Time zone</Label>
            <TimezoneSelect
              id="tz"
              value={timezone}
              onChange={(tz) => {
                setTimezone(tz);
                invalidate();
              }}
            />
          </div>
        </div>
      </div>

      {!preview ? (
        <Button size="lg" variant="outline" className="h-11" onClick={loadPreview} disabled={busy !== null || duplicate || !startDate || times.some((t) => !t)}>
          {busy === "preview" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Eye aria-hidden="true" />}
          Preview reminders
        </Button>
      ) : (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4" aria-live="polite">
          <div>
            <p className="font-medium">
              {preview.totalReminders} reminders for {preview.confirmed.medicineName}
            </p>
            <p className="text-sm text-muted-foreground">
              {preview.confirmed.doseAmount} at {preview.confirmed.dailyTimes.join(", ")} · from {startDate}{" "}
              {preview.confirmed.ongoing ? `(first ${28} days; ongoing)` : `to ${preview.endDate}`}
            </p>
          </div>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {preview.firstReminders.map((iso) => (
              <li key={iso} className="rounded-lg bg-card px-3 py-1.5 tabular-nums">
                {formatLocal(iso, timezone)}
              </li>
            ))}
            {preview.totalReminders > preview.firstReminders.length ? (
              <li className="px-3 py-1.5 text-muted-foreground">…and {preview.totalReminders - preview.firstReminders.length} more</li>
            ) : null}
          </ol>
          {startDate === todayIn(timezone) ? (
            <p className="text-xs text-muted-foreground">Any times earlier today that have already passed aren&apos;t included.</p>
          ) : null}
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={approved} onCheckedChange={(c) => setApproved(c)} className="mt-0.5" aria-describedby="approve-help" />
            <span>
              I&apos;ve checked these reminders match my verified instructions.
              <span id="approve-help" className="block text-xs text-muted-foreground">
                Reminders help you remember — they don&apos;t replace your original instructions or advice from your pharmacist.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-11" disabled={!approved || busy !== null} onClick={create}>
              {busy === "create" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CalendarCheck2 aria-hidden="true" />}
              Create schedule
            </Button>
            <Button size="lg" variant="ghost" className="h-11" onClick={invalidate} disabled={busy !== null}>
              Change times
            </Button>
          </div>
        </div>
      )}

      {error ? <Notice tone="danger" title="Couldn't continue">{error}</Notice> : null}
    </section>
  );
}
