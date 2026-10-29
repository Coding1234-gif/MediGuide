import { z } from "zod";

/**
 * Server-side environment. Every integration is optional so the app runs locally
 * without credentials; `integrationStatus()` reports what is actually configured.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optional,

  DATABASE_URL: optional,
  /** Local-only: where PGlite and uploaded files live when Postgres/Supabase aren't configured. */
  MEDIGUIDE_DATA_DIR: z.string().default(".data"),

  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  SUPABASE_STORAGE_BUCKET: z.string().default("instruction-documents"),

  OPENAI_API_KEY: optional,
  AI_EXTRACTION_MODEL: z.string().default("gpt-5-mini"),
  AI_SUMMARY_MODEL: z.string().default("gpt-5-mini"),

  /** Enables the demo sign-in (two fictional accounts) and fixture extraction. */
  MEDIGUIDE_DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  DEMO_SESSION_SECRET: optional,

  CRON_SECRET: optional,
  RESEND_API_KEY: optional,
  REMINDER_EMAIL_FROM: optional,
  SENTRY_DSN: optional,
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export function isSupabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Demo auth is allowed when Supabase isn't configured outside production, or when explicitly enabled. */
export function isDemoAuthEnabled(): boolean {
  if (env.MEDIGUIDE_DEMO_MODE) return true;
  return !isSupabaseConfigured() && env.NODE_ENV !== "production";
}

export function integrationStatus() {
  return {
    database: env.DATABASE_URL ? "postgres" : "local-pglite",
    auth: isSupabaseConfigured() ? "supabase" : "demo",
    storage: isSupabaseConfigured() && env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local",
    ai: env.OPENAI_API_KEY ? "openai" : "fixtures",
    email: env.RESEND_API_KEY && env.REMINDER_EMAIL_FROM ? "resend" : "disabled",
  } as const;
}
