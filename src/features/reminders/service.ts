import { and, asc, desc, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { ApiError } from "@/lib/errors";

export const REMINDER_STATUSES = ["scheduled", "delivered", "acknowledged", "missed", "cancelled"] as const;

export const listRemindersQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  status: z.enum(REMINDER_STATUSES).optional(),
  scheduleId: z.uuid().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListRemindersQuery = z.infer<typeof listRemindersQuerySchema>;

export type ReminderView = {
  id: string;
  scheduleId: string;
  scheduledAt: Date;
  status: (typeof REMINDER_STATUSES)[number];
  acknowledgedAt: Date | null;
  medicineName: string;
  doseAmount: string;
  timingInstructions: string | null;
  timezone: string;
  scheduleStatus: string;
};

export async function listReminders(userId: string, q: ListRemindersQuery): Promise<{ items: ReminderView[]; hasMore: boolean }> {
  const db = await getDb();
  const where: SQL[] = [eq(schema.reminderEvents.userId, userId)];
  if (q.from) where.push(gte(schema.reminderEvents.scheduledAt, new Date(q.from)));
  if (q.to) where.push(lt(schema.reminderEvents.scheduledAt, new Date(q.to)));
  if (q.status) where.push(eq(schema.reminderEvents.status, q.status));
  if (q.scheduleId) where.push(eq(schema.reminderEvents.scheduleId, q.scheduleId));

  const rows = await db
    .select({ event: schema.reminderEvents, schedule: schema.schedules })
    .from(schema.reminderEvents)
    .innerJoin(schema.schedules, eq(schema.reminderEvents.scheduleId, schema.schedules.id))
    .where(and(...where))
    .orderBy(q.order === "asc" ? asc(schema.reminderEvents.scheduledAt) : desc(schema.reminderEvents.scheduledAt))
    .limit(q.limit + 1)
    .offset(q.offset);

  const items = rows.slice(0, q.limit).map(({ event, schedule }) => {
    const ci = schedule.confirmedInstructions as { doseAmount: string; timingInstructions: string | null };
    return {
      id: event.id,
      scheduleId: event.scheduleId,
      scheduledAt: event.scheduledAt,
      status: event.status,
      acknowledgedAt: event.acknowledgedAt,
      medicineName: schedule.medicineName,
      doseAmount: ci.doseAmount,
      timingInstructions: ci.timingInstructions,
      timezone: schedule.timezone,
      scheduleStatus: schedule.status,
    };
  });
  return { items, hasMore: rows.length > q.limit };
}

export const updateReminderSchema = z.object({ action: z.enum(["acknowledge", "undo"]) });

/** Users may acknowledge (or undo) reminders from active/paused schedules; cancelled ones are read-only. */
export async function updateReminder(userId: string, reminderId: string, action: "acknowledge" | "undo") {
  const db = await getDb();
  const [row] = await db
    .select({ event: schema.reminderEvents, scheduleStatus: schema.schedules.status })
    .from(schema.reminderEvents)
    .innerJoin(schema.schedules, eq(schema.reminderEvents.scheduleId, schema.schedules.id))
    .where(and(eq(schema.reminderEvents.id, reminderId), eq(schema.reminderEvents.userId, userId)));
  if (!row) throw new ApiError("not_found", "Reminder not found.");
  if (row.event.status === "cancelled" || row.scheduleStatus === "cancelled") {
    throw new ApiError("conflict", "This reminder was cancelled.");
  }
  if (action === "acknowledge") {
    if (row.event.scheduledAt.getTime() > Date.now() + 2 * 3600 * 1000) {
      throw new ApiError("conflict", "You can only mark reminders as done from up to 2 hours before they're due.");
    }
    const [updated] = await db
      .update(schema.reminderEvents)
      .set({ status: "acknowledged", acknowledgedAt: new Date() })
      .where(and(eq(schema.reminderEvents.id, row.event.id), inArray(schema.reminderEvents.status, ["scheduled", "delivered", "missed"])))
      .returning();
    return updated ?? row.event;
  }
  const [updated] = await db
    .update(schema.reminderEvents)
    .set({ status: row.event.deliveredAt ? "delivered" : "scheduled", acknowledgedAt: null })
    .where(and(eq(schema.reminderEvents.id, row.event.id), eq(schema.reminderEvents.status, "acknowledged")))
    .returning();
  return updated ?? row.event;
}
