import { NextResponse } from "next/server";
import { listReminders, listRemindersQuerySchema } from "@/features/reminders/service";
import { requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

/** GET /api/reminders?from&to&status&scheduleId&order&limit&offset */
export const GET = withApi("reminders.list", async (request: Request) => {
  const user = await requireApiUser();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = listRemindersQuerySchema.parse(params);
  const { items, hasMore } = await listReminders(user.id, query);
  return NextResponse.json({ items, hasMore, nextOffset: hasMore ? query.offset + query.limit : null });
});
