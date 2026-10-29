import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { getProfile } from "@/features/profile/service";
import { listSchedules } from "@/features/scheduling/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { formatLocal } from "@/lib/scheduler/timezone";

export const metadata: Metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const user = await requireUserOrRedirect();
  const [schedules, profile] = await Promise.all([listSchedules(user.id), getProfile(user.id)]);
  const tz = profile?.timezone ?? "UTC";
  const current = schedules.filter((s) => ["active", "paused", "draft"].includes(s.status));
  const past = schedules.filter((s) => !["active", "paused", "draft"].includes(s.status));

  return (
    <>
      <PageHeader
        title="Schedules"
        description="Each schedule comes from one set of instructions you verified."
        actions={
          <Link href="/scan" className={buttonVariants()}>
            New from instructions
          </Link>
        }
      />
      {schedules.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="No schedules yet"
          description="Scan and verify your medicine instructions to create your first reminder schedule."
          action={
            <Link href="/scan" className={buttonVariants()}>
              Scan instructions
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <ScheduleGroup title="Current" items={current} tz={tz} empty="No active schedules." />
          {past.length > 0 ? <ScheduleGroup title="Past and stopped" items={past} tz={tz} /> : null}
        </div>
      )}
    </>
  );
}

function ScheduleGroup({ title, items, tz, empty }: { title: string; items: Awaited<ReturnType<typeof listSchedules>>; tz: string; empty?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link href={`/schedules/${s.id}`} className="flex h-full items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{s.medicineName}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.confirmedInstructions.doseAmount} · {s.confirmedInstructions.frequencySummary.toLowerCase()} at{" "}
                    {s.confirmedInstructions.dailyTimes.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.startDate}
                    {s.endDate ? ` → ${s.endDate}` : ""} · {s.acknowledged}/{s.total} done
                    {s.nextAt && s.status === "active" ? ` · next ${formatLocal(s.nextAt, tz, "EEE d MMM HH:mm")}` : ""}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
