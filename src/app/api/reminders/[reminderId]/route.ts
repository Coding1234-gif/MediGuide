import { NextResponse } from "next/server";
import { z } from "zod";
import { updateReminder, updateReminderSchema } from "@/features/reminders/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

export const PATCH = withApi("reminders.update", async (request: Request, ctx: RouteContext<"/api/reminders/[reminderId]">) => {
  const user = await requireApiUser();
  const { action } = updateReminderSchema.parse(await readJson(request));
  const reminder = await updateReminder(user.id, z.uuid().parse((await ctx.params).reminderId), action);
  return NextResponse.json({ reminder });
});
