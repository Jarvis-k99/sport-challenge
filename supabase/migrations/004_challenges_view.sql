-- =============================================================
-- Sport Challenge — view: challenges enriched with the
-- challenger / target / loser display names. Used by the
-- dashboard "Active challenges" + "Pending" lists, and by the
-- admin resolve panel.
-- Run this once in Supabase SQL Editor.
-- =============================================================

create or replace view public.v_challenges
  with (security_invoker = true) as
select
  c.id,
  c.challenger_id,
  challenger.display_name as challenger_name,
  c.target_id,
  target.display_name     as target_name,
  c.description,
  c.amount_cents,
  c.status,
  c.loser_id,
  loser.display_name      as loser_name,
  c.resolution_note,
  c.created_at,
  c.accepted_at,
  c.resolved_at
from public.challenges c
join public.profiles      challenger on challenger.id = c.challenger_id
join public.profiles      target     on target.id     = c.target_id
left join public.profiles loser      on loser.id      = c.loser_id;

grant select on public.v_challenges to authenticated;

select 'v_challenges created' as status;
