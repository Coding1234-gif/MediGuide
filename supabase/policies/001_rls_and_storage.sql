-- MediGuide: row-level security + private storage for Supabase.
-- Run AFTER `npm run db:migrate` (Drizzle creates the tables), in the Supabase SQL editor
-- or with `psql "$DATABASE_URL" -f supabase/policies/001_rls_and_storage.sql`.
--
-- Note: the Next.js server connects with the database owner role (DATABASE_URL), which
-- bypasses RLS; the server enforces ownership in every query (see src/features/*/service.ts).
-- These policies are defence in depth: they stop any direct access with the public anon key
-- or a user JWT from reaching another user's rows.

-- Tie profiles to Supabase Auth users and clean up on account deletion.
alter table public.profiles
  drop constraint if exists profiles_id_auth_users_fk,
  add constraint profiles_id_auth_users_fk foreign key (id) references auth.users (id) on delete cascade;

alter table public.profiles                enable row level security;
alter table public.symptom_sessions        enable row level security;
alter table public.documents               enable row level security;
alter table public.extractions             enable row level security;
alter table public.schedules               enable row level security;
alter table public.reminder_events         enable row level security;
alter table public.notification_deliveries enable row level security;

-- Owner-only access. No policies are granted to `anon`.
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists symptom_sessions_owner on public.symptom_sessions;
create policy symptom_sessions_owner on public.symptom_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists documents_owner on public.documents;
create policy documents_owner on public.documents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Raw AI extractions are read-only to clients (immutable); writes happen server-side only.
drop policy if exists extractions_owner_read on public.extractions;
create policy extractions_owner_read on public.extractions
  for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));

drop policy if exists schedules_owner_read on public.schedules;
create policy schedules_owner_read on public.schedules
  for select to authenticated using (user_id = auth.uid());

drop policy if exists reminder_events_owner_read on public.reminder_events;
create policy reminder_events_owner_read on public.reminder_events
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notification_deliveries_owner_read on public.notification_deliveries;
create policy notification_deliveries_owner_read on public.notification_deliveries
  for select to authenticated
  using (exists (select 1 from public.reminder_events e where e.id = reminder_event_id and e.user_id = auth.uid()));

-- Private bucket for instruction documents (objects stored as "<user_id>/<document_id>.<ext>").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instruction-documents', 'instruction-documents', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists instruction_documents_owner_read on storage.objects;
create policy instruction_documents_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'instruction-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists instruction_documents_owner_delete on storage.objects;
create policy instruction_documents_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'instruction-documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- Uploads go through the server (service role) after content validation, so no client insert policy.
