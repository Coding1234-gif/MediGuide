import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ExtractionResult, VerifiedFields } from "@/lib/validation/extraction";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const extractionStatusEnum = pgEnum("extraction_status", ["pending", "processing", "completed", "failed"]);
export const validationStatusEnum = pgEnum("validation_status", ["unverified", "verified", "rejected"]);
export const scheduleStatusEnum = pgEnum("schedule_status", ["draft", "active", "paused", "completed", "cancelled"]);
export const reminderStatusEnum = pgEnum("reminder_status", ["scheduled", "delivered", "acknowledged", "missed", "cancelled"]);
export const safetyStatusEnum = pgEnum("safety_status", ["routine", "seek_advice", "urgent", "unsupported"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "sent", "failed", "skipped"]);

export type NotificationPreferences = {
  email: boolean;
  browser: boolean;
};

/** One row per Supabase Auth user (id = auth.users.id). The FK to auth.users is added in supabase/policies. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  notificationPreferences: jsonb("notification_preferences")
    .$type<NotificationPreferences>()
    .notNull()
    .default({ email: false, browser: false }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const symptomSessions = pgTable(
  "symptom_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    structuredInput: jsonb("structured_input").notNull(),
    referenceIds: jsonb("reference_ids").$type<string[]>().notNull().default([]),
    generatedSummary: jsonb("generated_summary"),
    safetyStatus: safetyStatusEnum("safety_status").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("symptom_sessions_user_idx").on(t.userId, t.createdAt)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    originalName: text("original_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    sha256: text("sha256").notNull(),
    extractionStatus: extractionStatusEnum("extraction_status").notNull().default("pending"),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("documents_user_idx").on(t.userId, t.createdAt)],
);

export const extractions = pgTable(
  "extractions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    /** e.g. "openai:gpt-5-mini" or "fixture:v1" — fixture output is never presented as live AI. */
    modelIdentifier: text("model_identifier").notNull(),
    /** Raw, schema-validated model output. Immutable after insert. */
    extractedFields: jsonb("extracted_fields").$type<ExtractionResult>().notNull(),
    evidenceSpans: jsonb("evidence_spans").$type<Record<string, { source_text: string | null; page: number | null }>>().notNull(),
    validationStatus: validationStatusEnum("validation_status").notNull().default("unverified"),
    /** User-confirmed snapshot, stored separately from the raw extraction. */
    verifiedFields: jsonb("verified_fields").$type<VerifiedFields>(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("extractions_document_idx").on(t.documentId, t.createdAt)],
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    extractionId: uuid("extraction_id").notNull().references(() => extractions.id, { onDelete: "restrict" }),
    medicineName: text("medicine_name").notNull(),
    confirmedInstructions: jsonb("confirmed_instructions").notNull(),
    timezone: text("timezone").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: scheduleStatusEnum("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("schedules_user_idx").on(t.userId, t.status),
    // At most one live schedule per verified extraction (idempotent creation).
    uniqueIndex("schedules_extraction_live_uq")
      .on(t.extractionId)
      .where(sql`status in ('draft', 'active', 'paused')`),
  ],
);

export const reminderEvents = pgTable(
  "reminder_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
    /** Denormalised owner for RLS and fast per-user queries. */
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: reminderStatusEnum("status").notNull().default("scheduled"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reminder_events_schedule_time_uq").on(t.scheduleId, t.scheduledAt),
    index("reminder_events_user_time_idx").on(t.userId, t.scheduledAt),
    index("reminder_events_due_idx").on(t.status, t.scheduledAt),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderEventId: uuid("reminder_event_id").notNull().references(() => reminderEvents.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("notification_deliveries_event_channel_uq").on(t.reminderEventId, t.channel)],
);

export type Profile = typeof profiles.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type ExtractionRow = typeof extractions.$inferSelect;
export type ScheduleRow = typeof schedules.$inferSelect;
export type ReminderEventRow = typeof reminderEvents.$inferSelect;
export type SymptomSessionRow = typeof symptomSessions.$inferSelect;
