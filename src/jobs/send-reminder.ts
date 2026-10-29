import { and, eq, inArray, lte, gte, sql } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb, schema } from "@/lib/db";
import { logger } from "@/lib/utils/logger";

const MAX_ATTEMPTS = 3;
/** Reminders older than this when the job runs are marked missed rather than sent late. */
const STALE_AFTER_MS = 60 * 60 * 1000;

export type EmailSender = (args: { to: string; subject: string; text: string }) => Promise<{ id: string }>;

/** Resend over plain fetch (no SDK). Only used when RESEND_API_KEY and REMINDER_EMAIL_FROM are set. */
export const resendSender: EmailSender = async ({ to, subject, text }) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.REMINDER_EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
  return (await res.json()) as { id: string };
};

/**
 * Durable, idempotent dispatcher. Safe to run on any schedule (Vercel Cron, Trigger.dev, GitHub Actions):
 * - deliveries are unique per (reminder, channel), so repeats never double-send
 * - failed sends are retried up to MAX_ATTEMPTS on later runs
 * Email content is deliberately generic — no medicine names leave the system by email.
 */
export async function dispatchDueReminders(opts: {
  now?: Date;
  resolveEmail: (userId: string) => Promise<string | null>;
  send?: EmailSender;
}) {
  const now = opts.now ?? new Date();
  const db = await getDb();
  const emailEnabled = Boolean(opts.send ?? (env.RESEND_API_KEY && env.REMINDER_EMAIL_FROM));
  const send = opts.send ?? resendSender;

  await db
    .update(schema.reminderEvents)
    .set({ status: "missed" })
    .where(and(eq(schema.reminderEvents.status, "scheduled"), lte(schema.reminderEvents.scheduledAt, new Date(now.getTime() - STALE_AFTER_MS))));

  const due = await db
    .select({ event: schema.reminderEvents, prefs: schema.profiles.notificationPreferences })
    .from(schema.reminderEvents)
    .innerJoin(schema.schedules, eq(schema.reminderEvents.scheduleId, schema.schedules.id))
    .innerJoin(schema.profiles, eq(schema.reminderEvents.userId, schema.profiles.id))
    .where(
      and(
        eq(schema.schedules.status, "active"),
        inArray(schema.reminderEvents.status, ["scheduled"]),
        lte(schema.reminderEvents.scheduledAt, now),
        gte(schema.reminderEvents.scheduledAt, new Date(now.getTime() - STALE_AFTER_MS)),
      ),
    )
    .limit(200);

  const summary = { considered: due.length, sent: 0, skipped: 0, failed: 0 };
  for (const { event, prefs } of due) {
    if (!prefs.email || !emailEnabled) {
      summary.skipped++;
      await db.insert(schema.notificationDeliveries)
        .values({ reminderEventId: event.id, channel: "email", deliveryStatus: "skipped", lastError: !prefs.email ? "user_opted_out" : "channel_not_configured" })
        .onConflictDoNothing();
      continue;
    }
    const [delivery] = await db
      .insert(schema.notificationDeliveries)
      .values({ reminderEventId: event.id, channel: "email" })
      .onConflictDoUpdate({
        target: [schema.notificationDeliveries.reminderEventId, schema.notificationDeliveries.channel],
        set: { updatedAt: now },
        setWhere: sql`${schema.notificationDeliveries.deliveryStatus} in ('pending','failed') and ${schema.notificationDeliveries.attemptCount} < ${MAX_ATTEMPTS}`,
      })
      .returning();
    if (!delivery) continue; // already sent, skipped or exhausted

    try {
      const to = await opts.resolveEmail(event.userId);
      if (!to) throw new Error("no_email_address");
      const { id } = await send({
        to,
        subject: "MediGuide reminder",
        text: "You have a scheduled reminder in MediGuide. Open the app to see the details from your verified instructions.",
      });
      await db.update(schema.notificationDeliveries)
        .set({ deliveryStatus: "sent", providerMessageId: id, attemptCount: delivery.attemptCount + 1, lastError: null, updatedAt: now })
        .where(eq(schema.notificationDeliveries.id, delivery.id));
      await db.update(schema.reminderEvents).set({ status: "delivered", deliveredAt: now }).where(eq(schema.reminderEvents.id, event.id));
      summary.sent++;
    } catch (err) {
      await db.update(schema.notificationDeliveries)
        .set({ deliveryStatus: "failed", attemptCount: delivery.attemptCount + 1, lastError: err instanceof Error ? err.message.slice(0, 200) : "error", updatedAt: now })
        .where(eq(schema.notificationDeliveries.id, delivery.id));
      summary.failed++;
    }
  }
  logger.info("reminders.dispatch", summary);
  return summary;
}
