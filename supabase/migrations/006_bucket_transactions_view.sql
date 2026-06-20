-- =============================================================
-- Sport Challenge v2.0 — view: per-user bucket transactions.
--
-- One row per event that contributes to the bucket:
--   * one row per (user × closed week) where threshold was missed
--   * one row per lost (status='inactive') challenge
--
-- Drives the breakdown's "all entries into the bucket" list and
-- can be summed to reconcile against v_bucket_summary.
--
-- Columns:
--   user_id        uuid
--   display_name   text
--   occurred_at    timestamptz  -- when the obligation crystallised
--   kind           text         -- 'missed_week' | 'lost_challenge'
--   label          text         -- human-readable reason
--   amount_cents   integer      -- always positive
--
-- Run once in Supabase SQL Editor. Idempotent.
-- =============================================================

create or replace view public.v_bucket_transactions
  with (security_invoker = true) as
with cfg as (
  select start_date, end_date, min_per_week, fee_per_missed_week_cents
  from public.challenge_config where id = 1
),
weeks as (
  -- All week-starts inside the challenge that have already ended.
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
  group by p.id, p.display_name, w.week_start
),
missed_week_fees as (
  select
    wuc.user_id,
    wuc.display_name,
    -- Sunday 23:59:59 local: the moment the week locks in.
    (wuc.week_start + interval '6 days 23 hours 59 minutes 59 seconds')::timestamptz
                                                          as occurred_at,
    'missed_week'::text                                   as kind,
    'Missed week of ' || to_char(wuc.week_start, 'DD Mon') as label,
    cfg.fee_per_missed_week_cents::int                    as amount_cents
  from weekly_user_counts wuc
  cross join cfg
  where wuc.session_count < cfg.min_per_week
),
lost_challenges as (
  select
    c.loser_id               as user_id,
    p.display_name,
    c.resolved_at            as occurred_at,
    'lost_challenge'::text   as kind,
    'Lost: ' || c.description as label,
    c.amount_cents::int      as amount_cents
  from public.challenges c
  join public.profiles p on p.id = c.loser_id
  where c.status = 'inactive' and c.loser_id is not null
)
select * from missed_week_fees
union all
select * from lost_challenges;

grant select on public.v_bucket_transactions to authenticated;

select 'v_bucket_transactions created' as status;
