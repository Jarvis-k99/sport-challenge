-- =============================================================
-- Sport Challenge — season archive (run BEFORE 012_winter_season).
--
-- Why: every fee view reads the single challenge_config row, so
-- changing the dates for a new season would silently rewrite the
-- old season's numbers. This migration:
--   1. adds `season_archive` (frozen, read-only snapshot per season)
--   2. snapshots the CURRENT season (Season 1) from the live views
--   3. tags resolved challenges as belonging to that archive so they
--      stop counting toward the new season's bucket
--   4. adds challenge_config.season_name (shown in the UI)
--   5. re-creates v_bucket_summary / v_bucket_transactions so they
--      ignore archived challenges
--
-- MUST run while challenge_config still holds the old season's
-- dates. Idempotent: the snapshot is guarded by name, so a re-run
-- after the dates changed will not overwrite it.
-- =============================================================


-- ---------- 1. Archive table ----------

create table if not exists public.season_archive (
  id                        serial primary key,
  name                      text     not null unique,
  start_date                date     not null,
  end_date                  date     not null,
  min_per_week              smallint not null,
  fee_per_missed_week_cents integer  not null,
  currency                  text     not null,
  archived_at               timestamptz not null default now(),
  -- { users: [...], challenges: [...], bucket_total_cents: n }
  results                   jsonb    not null
);

alter table public.season_archive enable row level security;

drop policy if exists "season_archive readable by authenticated" on public.season_archive;
create policy "season_archive readable by authenticated"
  on public.season_archive for select
  to authenticated using (true);


-- ---------- 2. Columns ----------

alter table public.challenge_config
  add column if not exists season_name text not null default 'Season 1';

alter table public.challenges
  add column if not exists archived_in integer references public.season_archive(id);


-- ---------- 3. Snapshot the current season ----------

do $$
declare
  cfg   record;
  snap  jsonb;
begin
  if exists (select 1 from public.season_archive where name = 'Season 1') then
    raise notice 'Season 1 already archived — skipping snapshot';
    return;
  end if;

  select * into cfg from public.challenge_config where id = 1;

  snap := jsonb_build_object(
    'users', coalesce((
      select jsonb_agg(u order by u.total_sessions desc, u.display_name)
      from (
        select
          p.id                          as user_id,
          p.display_name,
          p.joined_at,
          ut.total_sessions,
          bs.missed_weeks,
          bs.missed_fee_cents,
          bs.lost_challenges_cents,
          bs.total_owed_cents,
          (
            select coalesce(jsonb_agg(jsonb_build_object(
                     'week_start', w.week_start,
                     'sessions',   (select count(*) from public.entries e
                                     where e.user_id = p.id
                                       and e.activity_date >= w.week_start
                                       and e.activity_date <  w.week_start + 7)
                   ) order by w.week_start), '[]'::jsonb)
            from (
              select gs::date as week_start
              from generate_series(
                     date_trunc('week', cfg.start_date)::date,
                     date_trunc('week', cfg.end_date)::date,
                     interval '7 days') gs
              where gs::date >= date_trunc('week', p.joined_at)::date
            ) w
          ) as weeks
        from public.profiles p
        join public.v_user_totals   ut on ut.user_id = p.id
        join public.v_bucket_summary bs on bs.user_id = p.id
      ) u
    ), '[]'::jsonb),
    'challenges', coalesce((
      select jsonb_agg(jsonb_build_object(
               'description', c.description,
               'amount_cents', c.amount_cents,
               'challenger',  ch.display_name,
               'target',      tg.display_name,
               'loser',       lo.display_name,
               'resolved_at', c.resolved_at
             ) order by c.resolved_at)
      from public.challenges c
      join public.profiles ch on ch.id = c.challenger_id
      join public.profiles tg on tg.id = c.target_id
      join public.profiles lo on lo.id = c.loser_id
      where c.status = 'inactive'
    ), '[]'::jsonb),
    'bucket_total_cents', (select coalesce(sum(total_owed_cents), 0) from public.v_bucket_summary)
  );

  insert into public.season_archive
    (name, start_date, end_date, min_per_week, fee_per_missed_week_cents, currency, results)
  values
    ('Season 1', cfg.start_date, cfg.end_date, cfg.min_per_week,
     cfg.fee_per_missed_week_cents, cfg.currency, snap);
end $$;


-- ---------- 4. Tag resolved challenges as archived ----------
-- Pending / active challenges are NOT touched: they stay live and
-- carry over into the next season until someone resolves them.

update public.challenges
   set archived_in = (select id from public.season_archive where name = 'Season 1')
 where status in ('inactive', 'declined')
   and archived_in is null
   and exists (select 1 from public.season_archive where name = 'Season 1');


-- ---------- 5. Views: ignore archived challenges ----------

create or replace view public.v_bucket_summary
  with (security_invoker = true) as
select
  p.id            as user_id,
  p.display_name,
  coalesce(mw.missed_weeks, 0)::int                                 as missed_weeks,
  (coalesce(mw.missed_weeks, 0) * cc.fee_per_missed_week_cents)::int as missed_fee_cents,
  coalesce(lc.lost_cents, 0)::int                                    as lost_challenges_cents,
  (coalesce(mw.missed_weeks, 0) * cc.fee_per_missed_week_cents
    + coalesce(lc.lost_cents, 0))::int                                as total_owed_cents
from public.profiles p
cross join public.challenge_config cc
left join public.v_missed_weeks mw on mw.user_id = p.id
left join lateral (
  select sum(amount_cents)::int as lost_cents
  from public.challenges c
  where c.loser_id = p.id
    and c.status = 'inactive'
    and c.archived_in is null
) lc on true
where cc.id = 1;

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
  where c.status = 'inactive'
    and c.loser_id is not null
    and c.archived_in is null
)
select * from missed_week_fees
union all
select * from lost_challenges;

grant select on public.v_bucket_summary      to authenticated;
grant select on public.v_bucket_transactions to authenticated;


-- ---------- 6. Sanity check ----------

select id, name, start_date, end_date,
       jsonb_array_length(results->'users')      as users,
       jsonb_array_length(results->'challenges') as challenges,
       (results->>'bucket_total_cents')::int / 100.0 as bucket_eur
  from public.season_archive
 order by id;
