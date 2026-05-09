-- =============================================================
-- Sport Challenge — view: recent entries enriched with display
-- name and activity emoji/name. Used by the dashboard feed.
-- Run this once in Supabase SQL Editor.
-- =============================================================

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
  e.created_at
from public.entries e
join public.profiles      p  on p.id  = e.user_id
join public.activity_types at on at.id = e.activity_type_id;

grant select on public.v_recent_entries to authenticated;

select 'v_recent_entries created' as status;
