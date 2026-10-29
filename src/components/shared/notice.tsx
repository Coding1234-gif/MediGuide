import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { box: "border-info/25 bg-info-soft text-foreground", icon: "text-info", Icon: Info },
  warning: { box: "border-warning/30 bg-warning-soft text-foreground", icon: "text-warning", Icon: AlertTriangle },
  danger: { box: "border-destructive/30 bg-danger-soft text-foreground", icon: "text-destructive", Icon: OctagonAlert },
  success: { box: "border-success/30 bg-success-soft text-foreground", icon: "text-success", Icon: CheckCircle2 },
} as const;

/** Inline callout used for safety messaging, errors and confirmations. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const t = TONES[tone];
  return (
    <div role={role ?? (tone === "danger" ? "alert" : undefined)} className={cn("flex gap-3 rounded-xl border p-4 text-sm", t.box, className)}>
      <t.Icon className={cn("mt-0.5 size-5 shrink-0", t.icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-foreground/85 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2">{children}</div> : null}
      </div>
    </div>
  );
}

/** Persistent, non-dismissable product boundary statement. */
export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      MediGuide provides general information and reminders only. It doesn&apos;t diagnose, prescribe, or replace advice from a
      pharmacist, doctor or other qualified professional. In an emergency, call your local emergency number.
    </p>
  );
}
