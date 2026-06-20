-- =============================================================
-- Sport Challenge v2.0 — per-user joined_at + late-joiner
-- exemption.
--
-- Until now v_missed_weeks and v_bucket_transactions counted
-- every closed challenge week against every user, even ones who
-- joined the challenge late (e.g. Luca). This migration adds
-- `profiles.joined_at` and updates both views so each user is
-- only on the hook for weeks where week_start >= the Monday of
-- their join week.
--
-- Existing profiles are backfilled to the challenge start_date
-- (no behavior change for them). Luca's joined_at is set to
-- today, so weeks before this Monday don't count for him.
--
-- The default for new profiles is current_date (today), so any
-- future late-joiner is automatically exempted from past weeks.
--
-- Run once in Supabase SQL Editor. Idempotent.
-- =============================================================


-- ---------- 1. Schema: profiles.joined_at ----------

alter table public.profiles
  add column if not exists joined_at date;

-- Backfill: anyone who already had a row joined at the start.
update public.profiles
   set joined_at = (select start_date from public.challenge_config where id = 1)
 where joined_at is null;

alter table public.profiles alter column joined_at set not null;
alter table public.profiles alter column joined_at set default current_date;


-- ---------- 2. Mark Luca as joined today ----------

update public.profiles
   set joined_at = current_date
 where id = (
   select id from auth.users where email = 'luca.miskovic.lm@gmail.com'
 );


-- ---------- 3. v_missed_weeks: skip pre-join weeks per user ----------

create or replace view public.v_missed_weeks
  with (security_invoker = true) as
with cfg as (
  select start_date, end_date, min_per_week from public.challenge_config where id = 1
),
weeks as (
  select gs::date as week_start
  from cfg,
       generate_series(
         date_trunc('week', cfg.start_date)::date,
         least(
           date_trunc('week', cfg.end_date)::date,
           public.this_week_start() - interval '7 days'
         )::date,
         interval '7 days'
       ) as gs
)
select
  p.id as user_id,
  count(*) filter (where coalesce(wc.week_count, 0) < cfg.min_per_week) as missed_weeks
from public.profiles p
cross join cfg
cross join weeks w
left join lateral (
  select count(*) as week_count
  from public.entries e
  where e.user_id = p.id
    and e.activity_date >= w.week_start
    and e.activity_date <  w.week_start + interval '7 days'
) wc on true
where w.week_start >= date_trunc('week', p.joined_at)::date
group by p.id;

grant select on public.v_missed_weeks to authenticated;


-- ---------- 4. v_bucket_transactions: same filter ----------

create or replace view public.v_bucket_transactions
  with (security_invoker = true) as
with cfg as (
  select start_date, end_date, min_per_week, fee_per_missed_week_cents
  from public.challenge_config where id = 1
),
weeks as (
  select gs::date as week_start
  from cfg,
       generate_series(
         date_trunc('week', cfg.start_date)::date,
         least(
           date_trunc('week', cfg.end_date)::date,
           public.this_week_start() - interval '7 days'
         )::date,
         interval '7 days'
       ) as gs
),
weekly_user_counts as (
  select
    p.id           as user_id,
    p.display_name,
    w.week_start,
    coalesce(count(e.id), 0)::int as session_count
  from public.profiles p
  cross join weeks w
  left join public.entries e
    on e.user_id = p.id
    and e.activity_date >= w.week_start
    and e.activity_date <  w.week_start + interval '7 days'
  where w.week_start >= date_trunc('week', p.joined_at)::date
  group by p.id, p.display_name, w.week_start
),
missed_week_fees as (
  select
    wuc.user_id,
    wuc.display_name,
    (wuc.week_start + interval '6 days 23 hours 59 minutes 59 seconds')::timestamptz
                                                           as occurred_at,
    'missed_week'::text                                    as kind,
    'Missed week of ' || to_char(wuc.week_start, 'DD Mon') as label,
    cfg.fee_per_missed_week_cents::int                     as amount_cents
  from weekly_user_counts wuc
  cross join cfg
  where wuc.session_count < cfg.min_per_week
),
lost_challenges as (
  select
    c.loser_id                as user_id,
    p.display_name,
    c.resolved_at             as occurred_at,
    'lost_challenge'::text    as kind,
    'Lost: ' || c.description as label,
    c.amount_cents::int       as amount_cents
  from public.challenges c
  join public.profiles p on p.id = c.loser_id
  where c.status = 'inactive' and c.loser_id is not null
)
select * from missed_week_fees
union all
select * from lost_challenges;

grant select on public.v_bucket_transactions to authenticated;


-- ---------- 5. Sanity check ----------

select id, display_name, joined_at, is_admin
  from public.profiles
 order by joined_at, display_name;
