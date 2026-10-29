"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, CalendarClock, HeartPulse, LayoutDashboard, LogOut, ScanLine, Settings, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, mobile: true },
  { href: "/scan", label: "Scan instructions", short: "Scan", icon: ScanLine, mobile: true },
  { href: "/reminders", label: "Reminders", icon: Bell, mobile: true },
  { href: "/schedules", label: "Schedules", icon: CalendarClock, mobile: false },
  { href: "/symptoms", label: "Symptom info", short: "Symptoms", icon: HeartPulse, mobile: true },
  { href: "/settings", label: "Settings", icon: Settings, mobile: true },
] as const;

export type ShellUser = { displayName: string; email: string | null; authMode: "supabase" | "demo" };
export type ShellIntegrations = { ai: "openai" | "fixtures"; auth: "supabase" | "demo"; database: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, integrations, children }: { user: ShellUser; integrations: ShellIntegrations; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    if (user.authMode === "demo") await apiFetch("/api/auth/demo", { method: "DELETE" }).catch(() => undefined);
    else await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const demoNotes = [
    integrations.auth === "demo" ? "fictional demo accounts" : null,
    integrations.ai === "fixtures" ? "sample-document fixtures instead of live AI" : null,
  ].filter(Boolean);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-5 md:flex">
        <Logo href="/dashboard" className="px-2" />
        <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Reminders only come from instructions you&apos;ve verified.
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              {user.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo href="/dashboard" />
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut aria-hidden="true" /> Sign out
        </Button>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        {demoNotes.length > 0 ? (
          <div className="border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-xs text-foreground/80" role="status">
            <strong className="font-semibold">Demo mode:</strong> using {demoNotes.join(" and ")}. Don&apos;t upload real medical documents.
          </div>
        ) : null}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => n.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground focus-visible:bg-accent focus-visible:outline-none",
                active && "text-primary",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
              {"short" in item ? item.short : item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
