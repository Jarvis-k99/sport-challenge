-- =============================================================
-- Sport Challenge v2.0 — view: per-user totals across the
-- whole challenge window. Drives the Statistics leaderboard.
-- Counts only entries dated inside [start_date, end_date].
--
-- Run once in Supabase SQL Editor. Idempotent.
-- =============================================================

create or replace view public.v_user_totals
  with (security_invoker = true) as
select
  p.id            as user_id,
  p.display_name,
  p.is_admin,
  coalesce(count(e.id), 0)::int as total_sessions
from public.profiles p
cross join public.challenge_config cc
left join public.entries e
  on e.user_id = p.id
  and e.activity_date >= cc.start_date
  and e.activity_date <= cc.end_date
where cc.id = 1
group by p.id, p.display_name, p.is_admin;

grant select on public.v_user_totals to authenticated;

select 'v_user_totals created' as status;
