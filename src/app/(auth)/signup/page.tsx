import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailAuthForm } from "@/components/auth/auth-forms";
import { Notice } from "@/components/shared/notice";
import { isSupabaseConfigured } from "@/config/env";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Your documents and reminders stay private to you.</CardDescription>
      </CardHeader>
      <CardContent>
        {isSupabaseConfigured() ? (
          <Suspense>
            <EmailAuthForm mode="signup" />
          </Suspense>
        ) : (
          <Notice tone="info" title="Account creation isn't set up on this server">
            This deployment runs without Supabase. <Link href="/login">Use a demo account</Link> instead.
          </Notice>
        )}
      </CardContent>
    </Card>
  );
}
