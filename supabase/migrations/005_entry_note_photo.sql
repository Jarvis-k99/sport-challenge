-- =============================================================
-- Sport Challenge v2.0 — add optional `note` and `photo_path`
-- columns to entries, and refresh `v_recent_entries` so the
-- dashboard feed surfaces them.
-- Run once in Supabase SQL Editor. Idempotent.
-- =============================================================

alter table public.entries
  add column if not exists note       text,
  add column if not exists photo_path text;

-- Cap notes at 200 chars to keep the UI tidy and storage small.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'entries_note_length_check'
  ) then
    alter table public.entries
      add constraint entries_note_length_check
      check (note is null or char_length(note) <= 200);
  end if;
end $$;

-- `photo_path` stores the object key inside Supabase Storage
-- (e.g. "{user_id}/{entry_id}.jpg"). The actual upload happens
-- in V2-B; column is nullable so existing rows are unaffected.

create or replace view public.v_recent_entries
  with (security_invoker = true) as
select
  e.id,
  e.user_id,
  p.display_name,
  e.activity_type_id,
  at.name        as activity_name,
  at.emoji       as activity_emoji,
  e.activity_date,
  e.created_at,
  e.note,
  e.photo_path
from public.entries e
join public.profiles      p  on p.id  = e.user_id
join public.activity_types at on at.id = e.activity_type_id;

grant select on public.v_recent_entries to authenticated;

select 'entries gained note + photo_path; v_recent_entries refreshed' as status;
