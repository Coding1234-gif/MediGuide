CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('scheduled', 'delivered', 'acknowledged', 'missed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."safety_status" AS ENUM('routine', 'seek_advice', 'urgent', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('unverified', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"extraction_status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"model_identifier" text NOT NULL,
	"extracted_fields" jsonb NOT NULL,
	"evidence_spans" jsonb NOT NULL,
	"validation_status" "validation_status" DEFAULT 'unverified' NOT NULL,
	"verified_fields" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_event_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"email":false,"browser":false}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "reminder_status" DEFAULT 'scheduled' NOT NULL,
	"delivered_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"extraction_id" uuid NOT NULL,
	"medicine_name" text NOT NULL,
	"confirmed_instructions" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "schedule_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"structured_input" jsonb NOT NULL,
	"reference_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_summary" jsonb,
	"safety_status" "safety_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_reminder_event_id_reminder_events_id_fk" FOREIGN KEY ("reminder_event_id") REFERENCES "public"."reminder_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_sessions" ADD CONSTRAINT "symptom_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_user_idx" ON "documents" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "extractions_document_idx" ON "extractions" USING btree ("document_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_event_channel_uq" ON "notification_deliveries" USING btree ("reminder_event_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_events_schedule_time_uq" ON "reminder_events" USING btree ("schedule_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "reminder_events_user_time_idx" ON "reminder_events" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "reminder_events_due_idx" ON "reminder_events" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "schedules_user_idx" ON "schedules" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_extraction_live_uq" ON "schedules" USING btree ("extraction_id") WHERE status in ('draft', 'active', 'paused');--> statement-breakpoint
CREATE INDEX "symptom_sessions_user_idx" ON "symptom_sessions" USING btree ("user_id","created_at");