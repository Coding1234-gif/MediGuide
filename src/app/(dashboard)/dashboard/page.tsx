import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, CheckCircle2, HeartPulse, ScanLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/page-header";
import { MedicalDisclaimer } from "@/components/shared/notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReminderList } from "@/components/reminders/reminder-list";
import { listDocuments } from "@/features/document-extraction/service";
import { getProfile } from "@/features/profile/service";
import { remindersForLocalDay } from "@/features/reminders/queries";
import { listSchedules } from "@/features/scheduling/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { formatLocal } from "@/lib/scheduler/timezone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

function greeting(tz: string) {
  const h = Number(formatLocal(new Date(), tz, "H"));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "UTC";
  const [today, tomorrow, schedules, docs] = await Promise.all([
    remindersForLocalDay(user.id, tz, 0),
    remindersForLocalDay(user.id, tz, 1),
    listSchedules(user.id),
    listDocuments(user.id),
  ]);
  const active = schedules.filter((s) => s.status === "active" || s.status === "paused");
  const doneToday = today.filter((r) => r.status === "acknowledged").length;
  const awaitingVerification = docs.filter((d) => d.extractionStatus === "completed").slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-secondary via-card to-card p-6 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{formatLocal(new Date(), tz, "EEEE d MMMM")}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting(tz)}, {user.displayName.replace(" (demo)", "")}
          </h1>
          <p className="text-muted-foreground">
            {today.length === 0
              ? "No reminders today."
              : `${doneToday} of ${today.length} reminder${today.length > 1 ? "s" : ""} marked done today.`}
          </p>
        </div>
        {today.length > 0 ? (
          <div className="flex items-center gap-3">
            <div
              className="relative size-16"
              role="img"
              aria-label={`${doneToday} of ${today.length} done`}
              style={{ background: `conic-gradient(var(--success) ${(doneToday / today.length) * 360}deg, var(--muted) 0)`, borderRadius: "9999px" }}
            >
              <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-card text-sm font-semibold tabular-nums">
                {Math.round((doneToday / today.length) * 100)}%
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <QuickAction href="/scan" icon={<ScanLine />} title="Scan instructions" text="Turn a label or leaflet into clear, checked details." primary />
        <QuickAction href="/symptoms" icon={<HeartPulse />} title="Explore symptoms" text="Find trusted, sourced health information." />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="today-title" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="today-title" className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="size-5 text-primary" aria-hidden="true" /> Today
            </h2>
            <Link href="/reminders" className="text-sm font-medium text-primary hover:underline">
              All reminders
            </Link>
          </div>
          {today.length === 0 && active.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="No reminders yet"
              description="Scan your medicine instructions, verify the details, and MediGuide will build a reminder schedule."
              action={
                <Link href="/scan" className={buttonVariants()}>
                  Scan instructions
                </Link>
              }
            />
          ) : (
            <ReminderList items={today} timezone={tz} emptyText="Nothing scheduled for today." />
          )}
          {tomorrow.length > 0 ? (
            <>
              <h3 className="pt-3 text-sm font-semibold text-muted-foreground">Tomorrow</h3>
              <ReminderList items={tomorrow.slice(0, 4)} timezone={tz} />
            </>
          ) : null}
        </section>

        <div className="space-y-8">
          <section aria-labelledby="schedules-title" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="schedules-title" className="text-lg font-semibold">Active schedules</h2>
              <Link href="/schedules" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {active.length === 0 ? (
              <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No active schedules.</p>
            ) : (
              <ul className="space-y-2">
                {active.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <Link href={`/schedules/${s.id}`} className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{s.medicineName}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.confirmedInstructions.frequencySummary} · {s.confirmedInstructions.dailyTimes.join(", ")}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div className="h-full rounded-full bg-success" style={{ width: `${s.total ? (s.acknowledged / s.total) * 100 : 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.acknowledged}/{s.total} marked done{s.nextAt ? ` · next ${formatLocal(s.nextAt, tz, "EEE HH:mm")}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {awaitingVerification.length > 0 ? (
            <section aria-labelledby="recent-title" className="space-y-3">
              <h2 id="recent-title" className="text-lg font-semibold">Recent scans</h2>
              <ul className="space-y-2">
                {awaitingVerification.map((d) => (
                  <li key={d.id}>
                    <Link href={`/scan/${d.id}`} className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm hover:border-primary/40">
                      <span className="truncate">{d.originalName}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Card size="sm" className="bg-muted/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> About “done”
              </CardTitle>
              <CardDescription>
                Marking a reminder as done is a personal note. It isn&apos;t a medical record and doesn&apos;t confirm a medicine was taken correctly.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

function QuickAction({ href, icon, title, text, primary }: { href: string; icon: React.ReactNode; title: string; text: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        primary ? "border-primary/20 bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <span
        className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", primary ? "bg-primary-foreground/15" : "bg-secondary text-primary")}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className={cn("block text-sm", primary ? "text-primary-foreground/80" : "text-muted-foreground")}>{text}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
