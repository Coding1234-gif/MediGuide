# Deployment (Vercel + Supabase)

## 1. Supabase

1. Create a project (choose a region near your users).
2. **Database:** copy the *transaction pooler* connection string (port 6543) into `DATABASE_URL`.
3. Run migrations from your machine:

   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```

4. Run `supabase/policies/001_rls_and_storage.sql` in the SQL editor. This enables RLS, links `profiles` to `auth.users`, and creates the **private** `instruction-documents` bucket.
5. **Auth → URL configuration:** set the Site URL to your Vercel URL and add `https://<app>/dashboard` and `https://<app>/settings` to the redirect URLs.
6. Copy the project URL, anon key and service-role key.

## 2. Vercel

1. Import the GitHub repo. The framework preset is Next.js; Node 22 is recommended.
2. Environment variables (Production and Preview):
   - Required: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`.
   - Optional: `AI_EXTRACTION_MODEL`, `RESEND_API_KEY`, `REMINDER_EMAIL_FROM`, `SENTRY_DSN`.
   - **Demo deployment only:** `MEDIGUIDE_DEMO_MODE=true` and a random `DEMO_SESSION_SECRET`. Use only with fictional data.
3. Deploy. `vercel.json` registers a **daily** cron for `/api/cron/dispatch-reminders`; Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## 3. Reminder dispatch frequency

Vercel Hobby crons run at most once a day, which is too coarse for medication reminders. Pick one of these:

- **Trigger.dev** (preferred in the brief): a scheduled task every 5 minutes that calls the endpoint, or imports `dispatchDueReminders` directly.
- **GitHub Actions** cron (`*/5 * * * *`), using `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/dispatch-reminders`.
- **Supabase pg_cron + pg_net** calling the same URL.

The endpoint is idempotent, so overlapping runs are safe. Until a frequent scheduler is set up, rely on in-app reminders and calendar (.ics) export.

## 4. Smoke test on production

Sign up → confirm email → scan `public/samples/clear-course.png` → verify → create schedule → check the dashboard →
scan `as-directed.png` and confirm it is blocked → try another account's document URL and confirm you get 404.

## Notes

- Never deploy without `DATABASE_URL`: the PGlite fallback needs a writable disk and refuses to start in production unless demo mode is explicitly on.
- The `next.config.ts` security headers apply site-wide, and documents are served with `Cache-Control: private, no-store`.
