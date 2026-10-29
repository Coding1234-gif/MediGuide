"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/shared/notice";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});
type Credentials = z.infer<typeof credentialsSchema>;

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function EmailAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const form = useForm<Credentials>({ resolver: zodResolver(credentialsSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Credentials) {
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) return setError("That email and password didn't match. Please try again.");
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...values,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) return setError(error.message);
      if (!data.session) return setInfo("Check your email to confirm your account, then sign in.");
      router.replace("/dashboard");
      router.refresh();
    }
  }

  async function resetPassword() {
    const email = form.getValues("email");
    if (!z.email().safeParse(email).success) {
      form.setError("email", { message: "Enter your email first, then choose “Forgot password”." });
      return;
    }
    await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/settings` });
    setInfo("If an account exists for that email, a reset link is on its way.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" className="h-10 text-base" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...form.register("email")} />
        {errors.email ? <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "login" ? (
            <button type="button" onClick={resetPassword} className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </button>
          ) : null}
        </div>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="h-10 text-base"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...form.register("password")}
        />
        {errors.password ? <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p> : null}
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {info ? <Notice tone="success">{info}</Notice> : null}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>New to MediGuide? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}

export function DemoSignIn({ users }: { users: Array<{ id: string; displayName: string }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setBusy(userId);
    setError(null);
    try {
      await apiFetch("/api/auth/demo", { method: "POST", json: { userId } });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't sign in.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <Button key={u.id} variant="outline" size="lg" className="h-11 w-full justify-start" onClick={() => signIn(u.id)} disabled={busy !== null}>
          {busy === u.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserRound aria-hidden="true" />}
          Continue as {u.displayName}
        </Button>
      ))}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <p className="text-xs text-muted-foreground">Demo accounts are fictional and shared. Use only the bundled sample documents.</p>
    </div>
  );
}
