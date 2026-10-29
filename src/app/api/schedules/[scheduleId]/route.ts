import { NextResponse } from "next/server";
import { z } from "zod";
import { getScheduleForUser, updateScheduleStatus } from "@/features/scheduling/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApi("schedules.get", async (_request: Request, ctx: RouteContext<"/api/schedules/[scheduleId]">) => {
  const user = await requireApiUser();
  return NextResponse.json(await getScheduleForUser(user.id, z.uuid().parse((await ctx.params).scheduleId)));
});

const patchSchema = z.object({ status: z.enum(["active", "paused", "cancelled"]) });

export const PATCH = withApi("schedules.update", async (request: Request, ctx: RouteContext<"/api/schedules/[scheduleId]">) => {
  const user = await requireApiUser();
  const { status } = patchSchema.parse(await readJson(request));
  const schedule = await updateScheduleStatus(user.id, z.uuid().parse((await ctx.params).scheduleId), status);
  return NextResponse.json({ schedule });
});
