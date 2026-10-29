import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, updateProfile } from "@/features/profile/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";
import { isValidTimeZone } from "@/lib/scheduler/timezone";

export const runtime = "nodejs";

export const GET = withApi("settings.get", async () => {
  const user = await requireApiUser();
  return NextResponse.json({ profile: await getProfile(user.id) });
});

const patchSchema = z.object({ timezone: z.string().refine(isValidTimeZone, "Unknown time zone.") });

/** Changing the timezone affects display and new schedules; existing reminders keep their UTC instants. */
export const PATCH = withApi("settings.update", async (request: Request) => {
  const user = await requireApiUser();
  const { timezone } = patchSchema.parse(await readJson(request));
  return NextResponse.json({ profile: await updateProfile(user.id, { timezone }) });
});
