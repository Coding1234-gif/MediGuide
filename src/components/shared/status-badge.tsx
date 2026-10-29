import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string }> = {
  // field statuses
  extracted: { label: "Read clearly", className: "bg-success-soft text-success border-success/25" },
  missing: { label: "Not found", className: "bg-muted text-muted-foreground border-border" },
  unclear: { label: "Unclear", className: "bg-danger-soft text-destructive border-destructive/25" },
  needs_verification: { label: "Check carefully", className: "bg-warning-soft text-warning border-warning/30" },
  // verification states
  confirmed: { label: "Confirmed", className: "bg-success-soft text-success border-success/25" },
  corrected: { label: "Corrected", className: "bg-info-soft text-info border-info/25" },
  // schedules
  active: { label: "Active", className: "bg-success-soft text-success border-success/25" },
  paused: { label: "Paused", className: "bg-warning-soft text-warning border-warning/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Stopped", className: "bg-muted text-muted-foreground border-border" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  // reminders
  scheduled: { label: "Upcoming", className: "bg-secondary text-secondary-foreground border-primary/15" },
  delivered: { label: "Sent", className: "bg-info-soft text-info border-info/25" },
  acknowledged: { label: "Done", className: "bg-success-soft text-success border-success/25" },
  missed: { label: "Not marked", className: "bg-warning-soft text-warning border-warning/30" },
  // documents
  pending: { label: "Not processed", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Reading…", className: "bg-info-soft text-info border-info/25" },
  failed: { label: "Couldn't read", className: "bg-danger-soft text-destructive border-destructive/25" },
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const s = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium whitespace-nowrap", s.className, className)}>
      {label ?? s.label}
    </span>
  );
}
