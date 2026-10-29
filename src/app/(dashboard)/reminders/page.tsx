import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { ReminderList } from "@/components/reminders/reminder-list";
import { WeekView } from "@/components/reminders/week-view";
import { getProfile } from "@/features/profile/service";
import { localDayBounds, toItem } from "@/features/reminders/queries";
import { listReminders } from "@/features/reminders/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { formatLocal, localDateInZone } from "@/lib/scheduler/timezone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reminders" };

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "History" },
] as const;

export default async function RemindersPage({ searchParams }: PageProps<"/reminders">) {
  const user = await requireUserOrRedirect();
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.id === sp.view)?.id ?? "today";
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "UTC";
  const now = new Date();

  let content: React.ReactNode;
  if (view === "today") {
    const { from, to } = localDayBounds(tz);
    const { items } = await listReminders(user.id, { from: from.toISOString(), to: to.toISOString(), order: "asc", limit: 100, offset: 0 });
    const visible = items.filter((i) => i.status !== "cancelled").map(toItem);
    content =
      visible.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="Nothing scheduled today"
          description="Reminders from your verified schedules will appear here."
          action={<Link href="/scan" className={buttonVariants({ variant: "outline" })}>Scan instructions</Link>}
        />
      ) : (
        <ReminderList items={visible} timezone={tz} />
      );
  } else if (view === "week") {
    const { from } = localDayBounds(tz);
    const { to } = localDayBounds(tz, 7);
    const { items } = await listReminders(user.id, { from: from.toISOString(), to: to.toISOString(), order: "asc", limit: 200, offset: 0 });
    const days = Array.from({ length: 7 }, (_, i) => localDayBounds(tz, i).date);
    const byDay = days.map((date) => ({
      date,
      items: items.filter((r) => r.status !== "cancelled" && localDateInZone(r.scheduledAt, tz) === date).map(toItem),
    }));
    content = <WeekView days={byDay} timezone={tz} today={localDateInZone(now, tz)} />;
  } else if (view === "upcoming") {
    const { items } = await listReminders(user.id, { from: now.toISOString(), status: "scheduled", order: "asc", limit: 50, offset: 0 });
    content = <ReminderList items={items.map(toItem)} timezone={tz} timeFormat="full" emptyText="No upcoming reminders." />;
  } else {
    const { items } = await listReminders(user.id, { to: now.toISOString(), order: "desc", limit: 50, offset: 0 });
    content = <ReminderList items={items.filter((i) => i.status !== "cancelled").map(toItem)} timezone={tz} timeFormat="full" emptyText="No past reminders yet." />;
  }

  return (
    <>
      <PageHeader title="Reminders" description={`Times shown in ${tz.replace(/_/g, " ")} · ${formatLocal(now, tz, "EEEE d MMMM")}`} />
      <nav aria-label="Reminder views" className="mb-5 inline-flex rounded-xl bg-muted p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={`/reminders?view=${v.id}`}
            aria-current={view === v.id ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              view === v.id && "bg-card text-foreground shadow-sm",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {content}
      <p className="mt-6 text-xs text-muted-foreground">
        Marking a reminder “done” is a personal note only — it isn&apos;t a medical record. You can mark reminders from up to 2 hours
        before they&apos;re due.
      </p>
    </>
  );
}
