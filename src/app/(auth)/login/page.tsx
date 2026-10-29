import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoSignIn, EmailAuthForm } from "@/components/auth/auth-forms";
import { Notice } from "@/components/shared/notice";
import { isDemoAuthEnabled, isSupabaseConfigured } from "@/config/env";
import { DEMO_USERS } from "@/lib/auth/demo";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const supabase = isSupabaseConfigured();
  const demo = isDemoAuthEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to see your reminders and verified instructions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense>
          {supabase ? <EmailAuthForm mode="login" /> : null}
          {supabase && demo ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" /> or try the demo <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          {demo ? <DemoSignIn users={DEMO_USERS.map((u) => ({ id: u.id, displayName: u.displayName }))} /> : null}
        </Suspense>
        {!supabase && !demo ? (
          <Notice tone="warning" title="Sign-in isn't configured">
            Set the Supabase environment variables, or enable demo mode, to sign in.
          </Notice>
        ) : null}
      </CardContent>
    </Card>
  );
}
