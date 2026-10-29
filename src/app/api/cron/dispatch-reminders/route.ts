import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/config/env";
import { dispatchDueReminders } from "@/jobs/send-reminder";
import { DEMO_USERS } from "@/lib/auth/demo";
import { errorResponse } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function resolveEmail(userId: string): Promise<string | null> {
  if (isSupabaseConfigured() && env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createSupabaseAdminClient().auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  }
  // Demo accounts use non-routable .test addresses; sending will be skipped unless configured.
  return DEMO_USERS.find((u) => u.id === userId)?.email ?? null;
}

/** Triggered by a scheduler with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return errorResponse("unauthorized", "Invalid cron credentials.");
  }
  return NextResponse.json(await dispatchDueReminders({ resolveEmail }));
}
