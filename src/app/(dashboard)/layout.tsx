import { AppShell } from "@/components/layout/app-shell";
import { integrationStatus } from "@/config/env";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { getProfile } from "@/features/profile/service";
import { TimezoneSync } from "@/components/layout/timezone-sync";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUserOrRedirect();
  const status = integrationStatus();
  const profile = await getProfile(user.id);
  return (
    <AppShell
      user={{ displayName: user.displayName, email: user.email, authMode: user.authMode }}
      integrations={{ ai: status.ai, auth: user.authMode, database: status.database }}
    >
      <TimezoneSync profileTimezone={profile?.timezone ?? "UTC"} />
      {children}
    </AppShell>
  );
}
