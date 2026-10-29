import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Notice } from "@/components/shared/notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReminderList } from "@/components/reminders/reminder-list";
import { ScheduleControls } from "@/components/schedules/schedule-controls";
import { getExtractionForUser } from "@/features/instruction-verification/service";
import { getScheduleForUser } from "@/features/scheduling/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors";
import { formatLocal } from "@/lib/scheduler/timezone";

export const metadata: Metadata = { title: "Schedule" };

export default async function ScheduleDetailPage({ params }: PageProps<"/schedules/[scheduleId]">) {
  const user = await requireUserOrRedirect();
  const { scheduleId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scheduleId)) notFound();
  const data = await getScheduleForUser(user.id, scheduleId).catch((err) => {
    if (err instanceof ApiError && err.code === "not_found") notFound();
    throw err;
  });
  const { schedule, events } = data;
  const ci = schedule.confirmedInstructions;
  const tz = schedule.timezone;
  const { document } = await getExtractionForUser(user.id, schedule.extractionId).catch(() => ({ document: null }));

  const { upcoming, history } = splitEvents(events);
  const toItem = (e: (typeof events)[number]) => ({
    id: e.id,
    scheduleId: schedule.id,
    scheduledAt: e.scheduledAt.toISOString(),
    status: e.status,
    medicineName: schedule.medicineName,
    doseAmount: ci.doseAmount,
    timingInstructions: ci.timingInstructions,
    scheduleStatus: schedule.status,
  });

  return (
    <>
      <Link href="/schedules" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> All schedules
      </Link>
      <PageHeader
        title={schedule.medicineName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={schedule.status} /> {ci.frequencySummary} at {ci.dailyTimes.join(", ")} · {tz.replace(/_/g, " ")}
          </span>
        }
        actions={<ScheduleControls scheduleId={schedule.id} status={schedule.status} />}
      />

      {schedule.status === "paused" ? (
        <Notice tone="warning" title="This schedule is paused" className="mb-6">
          Reminders won&apos;t be sent while paused. Resume it when you&apos;re ready.
        </Notice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="instr-title" className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 id="instr-title" className="mb-3 font-semibold">Verified instructions</h2>
            <dl className="space-y-3 text-sm">
              <Row label="Amount per dose" value={ci.doseAmount} />
              <Row label="How often (as written)" value={ci.frequencyText} />
              <Row label="When" value={ci.timingInstructions} />
              <Row label="How long (as written)" value={ci.durationText} />
              <Row label="Strength" value={ci.strength} />
              <Row label="How to take it" value={ci.route} />
              <Row label="Special conditions" value={ci.specialConditions} />
              <Row label="Dates" value={`${schedule.startDate}${schedule.endDate ? ` to ${schedule.endDate}` : ""}${ci.ongoing ? " (ongoing — first 28 days scheduled)" : ""}`} />
            </dl>
            {document ? (
              <Link href={`/scan/${document.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <FileText className="size-4" aria-hidden="true" /> View original document
              </Link>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">The original document has been deleted.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Times are shown in {tz.replace(/_/g, " ")}. If you travel, your reminders stay at the same moments in time; create a new
            schedule if you need to change the times.
          </p>
        </section>

        <section aria-labelledby="upcoming-title" className="space-y-6">
          <div className="space-y-3">
            <h2 id="upcoming-title" className="text-lg font-semibold">Upcoming ({upcoming.length})</h2>
            <ReminderList items={upcoming.slice(0, 30).map(toItem)} timezone={tz} timeFormat="full" showSchedule={false} emptyText="No upcoming reminders." />
            {upcoming.length > 30 ? <p className="text-sm text-muted-foreground">…and {upcoming.length - 30} more.</p> : null}
          </div>
          {history.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">History</h2>
              <ReminderList items={history.slice(0, 30).map(toItem)} timezone={tz} timeFormat="full" showSchedule={false} />
            </div>
          ) : null}
          {events.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Created {formatLocal(schedule.createdAt, tz)} · {events.length} reminders generated from your verified instructions.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}

/** Reminders still actionable (from 2 h ago onward) vs. history, newest first. */
function splitEvents<T extends { status: string; scheduledAt: Date }>(events: T[], now = Date.now()) {
  const cutoff = now - 2 * 3600 * 1000;
  const visible = events.filter((e) => e.status !== "cancelled");
  return {
    upcoming: visible.filter((e) => e.scheduledAt.getTime() >= cutoff),
    history: visible.filter((e) => e.scheduledAt.getTime() < cutoff).reverse(),
  };
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground italic"}>{value ?? "Not stated"}</dd>
    </div>
  );
}
