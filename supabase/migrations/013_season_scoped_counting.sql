-- =============================================================
-- Sport Challenge — make every count follow challenge_config.
--
-- challenge_config (id = 1) is the single "current season"
-- definition. Two gaps are closed here:
--
--   1. v_current_week_progress counted raw entries for the current
--      week even outside the season (e.g. during the break). It now
--      only counts entries inside [start_date, end_date], like
--      v_user_totals, v_missed_weeks and v_bucket_transactions.
--   2. Weekly fee logic assumes whole Mon–Sun weeks, so a season
--      must start on a Monday and end on a Sunday. Enforced by a
--      CHECK constraint so a future season can't be set up wrong.
--
-- Run after 011 + 012. Idempotent.
-- =============================================================

create or replace view public.v_current_week_progress
  with (security_invoker = true) as
select
  p.id                              as user_id,
  p.display_name,
  p.is_admin,
  cc.min_per_week,
  count(e.id)::int                  as session_count,
  (count(e.id) >= cc.min_per_week)  as threshold_met,
  public.this_week_start()          as week_start
from public.profiles p
cross join public.challenge_config cc
left join public.entries e
  on e.user_id = p.id
  and e.activity_date >= public.this_week_start()
  and e.activity_date <  public.this_week_start() + interval '7 days'
  and e.activity_date >= cc.start_date
  and e.activity_date <= cc.end_date
where cc.id = 1
group by p.id, p.display_name, p.is_admin, cc.min_per_week;

grant select on public.v_current_week_progress to authenticated;


alter table public.challenge_config
  drop constraint if exists season_weeks_aligned;
alter table public.challenge_config
  add constraint season_weeks_aligned check (
    extract(isodow from start_date) = 1      -- Monday
    and extract(isodow from end_date) = 7    -- Sunday
    and end_date > start_date
  );


select season_name, start_date, end_date from public.challenge_config where id = 1;
