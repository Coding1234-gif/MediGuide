import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { generateReminderPlan } from "@/lib/scheduler/engine";
import { describeFrequency } from "@/lib/scheduler/parse";
import {
  assessSchedulability,
  validateChosenTimes,
  type CreateScheduleRequest,
  type ScheduleOptions,
} from "@/lib/scheduler/validation";
import { getExtractionForUser } from "@/features/instruction-verification/service";
import type { VerifiedFields } from "@/lib/validation/extraction";

export type ConfirmedInstructions = {
  medicineName: string;
  strength: string | null;
  doseAmount: string;
  route: string | null;
  frequencyText: string;
  frequencySummary: string;
  timingInstructions: string | null;
  durationText: string;
  specialConditions: string | null;
  dailyTimes: string[];
  ongoing: boolean;
};

async function loadVerified(userId: string, extractionId: string) {
  const { extraction } = await getExtractionForUser(userId, extractionId);
  if (extraction.validationStatus !== "verified" || !extraction.verifiedFields) {
    throw new ApiError("unprocessable", "These instructions must be verified before a schedule can be created.");
  }
  return { extraction, fields: extraction.verifiedFields };
}

/** Build the reminder plan without saving anything — used for the approval preview. */
export function planFromVerified(fields: VerifiedFields, options: ScheduleOptions, now = new Date()) {
  const assessment = assessSchedulability(fields);
  if (!assessment.schedulable) {
    throw new ApiError("unprocessable", "These instructions can't be turned into an automatic schedule.", {
      reasons: assessment.reasons,
    });
  }
  const timeErrors = validateChosenTimes(assessment.pattern, options.times);
  if (timeErrors.length) throw new ApiError("bad_request", timeErrors[0], { reasons: timeErrors });

  const plan = generateReminderPlan({
    pattern: assessment.pattern,
    duration: assessment.duration,
    times: options.times,
    startDate: options.startDate,
    timezone: options.timezone,
    notBefore: now,
  });
  if (plan.events.length === 0) throw new ApiError("bad_request", "All reminders would be in the past. Choose a later start date.");

  const confirmed: ConfirmedInstructions = {
    medicineName: fields.medicine_name.value!,
    strength: fields.strength.value,
    doseAmount: fields.dose_amount.value!,
    route: fields.route.value,
    frequencyText: fields.frequency.value!,
    frequencySummary: describeFrequency(assessment.pattern),
    timingInstructions: fields.timing_instructions.value,
    durationText: fields.duration.value!,
    specialConditions: fields.special_conditions.value,
    dailyTimes: plan.dailyTimes,
    ongoing: assessment.duration.kind === "ongoing",
  };
  return { assessment, plan, confirmed };
}

export async function previewSchedule(userId: string, extractionId: string, options: ScheduleOptions) {
  const { fields } = await loadVerified(userId, extractionId);
  const { plan, confirmed } = planFromVerified(fields, options);
  return {
    confirmed,
    endDate: plan.endDate,
    totalReminders: plan.events.length,
    firstReminders: plan.events.slice(0, 6).map((d) => d.toISOString()),
  };
}

/** Transactional + idempotent: one live schedule per extraction; events unique per (schedule, time). */
export async function createSchedule(userId: string, req: CreateScheduleRequest) {
  const { extraction, fields } = await loadVerified(userId, req.extractionId);
  const { plan, confirmed } = planFromVerified(fields, req);
  const db = await getDb();

  const existing = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.extractionId, extraction.id), inArray(schema.schedules.status, ["draft", "active", "paused"])));
  if (existing.length > 0) return { schedule: existing[0], created: false };

  try {
    const schedule = await db.transaction(async (tx) => {
      const [s] = await tx
        .insert(schema.schedules)
        .values({
          userId,
          extractionId: extraction.id,
          medicineName: confirmed.medicineName,
          confirmedInstructions: confirmed,
          timezone: req.timezone,
          startDate: req.startDate,
          endDate: plan.endDate,
          status: "active",
        })
        .returning();
      await tx
        .insert(schema.reminderEvents)
        .values(plan.events.map((at) => ({ scheduleId: s.id, userId, scheduledAt: at })))
        .onConflictDoNothing();
      return s;
    });
    return { schedule, created: true };
  } catch (err) {
    // Unique partial index on live schedules → concurrent duplicate request.
    if (String((err as { code?: string })?.code ?? (err as Error)?.message).includes("23505")) {
      throw new ApiError("conflict", "A schedule for these instructions already exists.");
    }
    throw err;
  }
}

export async function listSchedules(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      schedule: schema.schedules,
      nextAt: sql<Date | null>`(select min(${schema.reminderEvents.scheduledAt}) from ${schema.reminderEvents} where ${schema.reminderEvents.scheduleId} = ${schema.schedules.id} and ${schema.reminderEvents.status} = 'scheduled' and ${schema.reminderEvents.scheduledAt} >= now())`,
      total: sql<number>`(select count(*)::int from ${schema.reminderEvents} where ${schema.reminderEvents.scheduleId} = ${schema.schedules.id} and ${schema.reminderEvents.status} <> 'cancelled')`,
      acknowledged: sql<number>`(select count(*)::int from ${schema.reminderEvents} where ${schema.reminderEvents.scheduleId} = ${schema.schedules.id} and ${schema.reminderEvents.status} = 'acknowledged')`,
    })
    .from(schema.schedules)
    .where(eq(schema.schedules.userId, userId))
    .orderBy(desc(schema.schedules.createdAt));
  return rows.map((r) => ({
    ...r.schedule,
    confirmedInstructions: r.schedule.confirmedInstructions as ConfirmedInstructions,
    nextAt: r.nextAt ? new Date(r.nextAt) : null,
    total: Number(r.total),
    acknowledged: Number(r.acknowledged),
  }));
}

export async function getScheduleForUser(userId: string, scheduleId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.id, scheduleId), eq(schema.schedules.userId, userId)));
  if (!row) throw new ApiError("not_found", "Schedule not found.");
  const events = await db
    .select()
    .from(schema.reminderEvents)
    .where(eq(schema.reminderEvents.scheduleId, row.id))
    .orderBy(asc(schema.reminderEvents.scheduledAt));
  return { schedule: { ...row, confirmedInstructions: row.confirmedInstructions as ConfirmedInstructions }, events };
}

const TRANSITIONS: Record<string, string[]> = {
  active: ["paused", "cancelled"],
  paused: ["active", "cancelled"],
  draft: ["active", "cancelled"],
};

/** Status changes; cancelling also cancels all future reminders. */
export async function updateScheduleStatus(userId: string, scheduleId: string, next: "active" | "paused" | "cancelled") {
  const { schedule } = await getScheduleForUser(userId, scheduleId);
  if (!TRANSITIONS[schedule.status]?.includes(next)) {
    throw new ApiError("conflict", `A ${schedule.status} schedule can't be changed to ${next}.`);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [s] = await tx
      .update(schema.schedules)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(schema.schedules.id, schedule.id))
      .returning();
    if (next === "cancelled") {
      await tx
        .update(schema.reminderEvents)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(schema.reminderEvents.scheduleId, schedule.id),
            eq(schema.reminderEvents.status, "scheduled"),
            gte(schema.reminderEvents.scheduledAt, new Date()),
          ),
        );
    }
    return s;
  });
}
