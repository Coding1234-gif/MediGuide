import { z } from "zod";
import { getScheduleForUser } from "@/features/scheduling/service";
import { buildIcs } from "@/lib/calendar/ics";
import { requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

/** GET /api/calendar?scheduleId=… → .ics download of upcoming, non-cancelled reminders. */
export const GET = withApi("calendar.export", async (request: Request) => {
  const user = await requireApiUser();
  const scheduleId = z.uuid().parse(new URL(request.url).searchParams.get("scheduleId"));
  const { schedule, events } = await getScheduleForUser(user.id, scheduleId);
  const ci = schedule.confirmedInstructions;
  const now = Date.now();
  const ics = buildIcs(
    events
      .filter((e) => e.status !== "cancelled" && e.scheduledAt.getTime() >= now)
      .map((e) => ({
        id: e.id,
        start: e.scheduledAt,
        title: `${ci.medicineName} — ${ci.doseAmount}`,
        description: [
          `As written on your verified instructions: ${ci.frequencyText}${ci.timingInstructions ? `, ${ci.timingInstructions}` : ""}.`,
          "Reminder only — follow your original instructions and ask your pharmacist if unsure.",
        ].join("\n"),
      })),
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mediguide-${schedule.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
});
