import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, updateProfile } from "@/features/profile/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

const prefsSchema = z.object({ email: z.boolean(), browser: z.boolean() });

export const GET = withApi("notifications.prefs.get", async () => {
  const user = await requireApiUser();
  const profile = await getProfile(user.id);
  return NextResponse.json({ preferences: profile?.notificationPreferences ?? { email: false, browser: false } });
});

export const PUT = withApi("notifications.prefs.put", async (request: Request) => {
  const user = await requireApiUser();
  const preferences = prefsSchema.parse(await readJson(request));
  const profile = await updateProfile(user.id, { notificationPreferences: preferences });
  return NextResponse.json({ preferences: profile.notificationPreferences });
});
