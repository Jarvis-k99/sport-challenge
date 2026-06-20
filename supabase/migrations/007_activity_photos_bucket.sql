-- =============================================================
-- Sport Challenge v2.0 — Supabase Storage bucket for activity
-- photos. Files live at `{user_id}/{uuid}.{ext}`.
--
-- Bucket is public-read (URLs are non-guessable UUID paths,
-- which is acceptable for a closed friend group). Only the
-- owning user can insert/delete their own files; RLS enforces
-- that the first path segment matches auth.uid().
--
-- Run once in Supabase SQL Editor. Idempotent.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-photos',
  'activity-photos',
  true,
  4194304,  -- 4 MB per file (kept under Vercel Hobby's 4.5 MB request body cap)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reads (the bucket is public, but be explicit so the SELECT path
-- works for both signed-in and signed-out URL hits).
drop policy if exists "activity-photos read" on storage.objects;
create policy "activity-photos read"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'activity-photos');

-- Inserts: only into your own folder.
drop policy if exists "activity-photos insert own" on storage.objects;
create policy "activity-photos insert own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'activity-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deletes: only your own files.
drop policy if exists "activity-photos delete own" on storage.objects;
create policy "activity-photos delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'activity-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

select 'activity-photos bucket configured' as status;
