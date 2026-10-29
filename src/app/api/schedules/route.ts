import { NextResponse } from "next/server";
import { createSchedule, listSchedules } from "@/features/scheduling/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";
import { createScheduleRequestSchema } from "@/lib/scheduler/validation";

export const runtime = "nodejs";

export const GET = withApi("schedules.list", async () => {
  const user = await requireApiUser();
  return NextResponse.json({ schedules: await listSchedules(user.id) });
});

export const POST = withApi("schedules.create", async (request: Request) => {
  const user = await requireApiUser();
  const body = createScheduleRequestSchema.parse(await readJson(request));
  const { schedule, created } = await createSchedule(user.id, body);
  return NextResponse.json({ schedule, created }, { status: created ? 201 : 200 });
});
