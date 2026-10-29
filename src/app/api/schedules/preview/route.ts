import { NextResponse } from "next/server";
import { z } from "zod";
import { previewSchedule } from "@/features/scheduling/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";
import { scheduleOptionsSchema } from "@/lib/scheduler/validation";

export const runtime = "nodejs";

const bodySchema = scheduleOptionsSchema.extend({ extractionId: z.uuid() });

/** Dry run: returns what would be scheduled so the user can approve it. Persists nothing. */
export const POST = withApi("schedules.preview", async (request: Request) => {
  const user = await requireApiUser();
  const { extractionId, ...options } = bodySchema.parse(await readJson(request));
  return NextResponse.json({ preview: await previewSchedule(user.id, extractionId, options) });
});
