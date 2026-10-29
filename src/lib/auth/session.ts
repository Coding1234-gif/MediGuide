import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isDemoAuthEnabled, isSupabaseConfigured } from "@/config/env";
import { DEMO_COOKIE, verifyDemoToken } from "./demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/features/profile/service";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string;
  authMode: "supabase" | "demo";
};

/** Resolve the signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Always render per request: without this, a build where no auth reads cookies would prerender the signed-out state.
  await connection();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const user: CurrentUser = {
        id: data.user.id,
        email: data.user.email ?? null,
        displayName: data.user.email?.split("@")[0] ?? "there",
        authMode: "supabase",
      };
      await ensureProfile(user.id);
      return user;
    }
  }
  if (isDemoAuthEnabled()) {
    const demo = verifyDemoToken((await cookies()).get(DEMO_COOKIE)?.value);
    if (demo) {
      await ensureProfile(demo.id);
      return { id: demo.id, email: demo.email, displayName: demo.displayName, authMode: "demo" };
    }
  }
  return null;
});

/** For Server Components: redirect to login when signed out. */
export async function requireUserOrRedirect(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
