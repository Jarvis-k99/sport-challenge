-- =============================================================
-- Sport Challenge — initial schema, RLS, views, triggers.
-- Run this once in Supabase SQL Editor BEFORE creating user
-- accounts. Re-runnable: every statement is idempotent.
-- =============================================================


-- =============================================================
-- 1. Tables
-- =============================================================

-- One row per app user. Mirrors auth.users with display + admin flag.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Seed table for the 9 activity types (Running, Gym, ...).
create table if not exists public.activity_types (
  id         smallint primary key,
  name       text     not null unique,
  emoji      text,
  sort_order smallint not null
);

-- Single-row table holding challenge-wide settings.
create table if not exists public.challenge_config (
  id                        smallint primary key default 1 check (id = 1),
  start_date                date     not null,
  end_date                  date     not null,
  min_per_week              smallint not null default 3,
  fee_per_missed_week_cents integer  not null default 500,
  currency                  text     not null default 'EUR',
  timezone                  text     not null default 'Europe/Berlin'
);

-- Activity log entries.
create table if not exists public.entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  activity_type_id smallint not null references public.activity_types(id),
  activity_date    date not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_entries_user_date on public.entries(user_id, activity_date);
create index if not exists idx_entries_date      on public.entries(activity_date desc);

-- Peer-to-peer challenges.
create table if not exists public.challenges (
  id              uuid primary key default gen_random_uuid(),
  challenger_id   uuid not null references auth.users(id),
  target_id       uuid not null references auth.users(id),
  description     text not null,
  amount_cents    integer not null check (amount_cents > 0),
  status          text not null default 'pending'
                    check (status in ('pending', 'active', 'declined', 'inactive')),
  loser_id        uuid references auth.users(id),
  resolution_note text,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  resolved_at     timestamptz,
  check (challenger_id <> target_id),
  check (status <> 'inactive' or loser_id is not null)
);

create index if not exists idx_challenges_status on public.challenges(status);
create index if not exists idx_challenges_target on public.challenges(target_id);


-- =============================================================
-- 2. Seed data
-- =============================================================

insert into public.activity_types (id, name, emoji, sort_order) values
  (1, 'Running',  '🏃',  1),
  (2, 'Gym',      '🏋️',  2),
  (3, 'Biking',   '🚴',  3),
  (4, 'Climbing', '🧗',  4),
  (5, 'Yoga',     '🧘',  5),
  (6, 'Swimming', '🏊',  6),
  (7, 'Hiking',   '🥾',  7),
  (8, 'Skiing',   '⛷️',  8),
  (9, 'Other',    '➕',  9)
on conflict (id) do update set
  name       = excluded.name,
  emoji      = excluded.emoji,
  sort_order = excluded.sort_order;

insert into public.challenge_config
  (id, start_date, end_date, min_per_week, fee_per_missed_week_cents, currency, timezone)
values
  (1, date '2026-05-04', date '2026-08-30', 3, 500, 'EUR', 'Europe/Berlin')
on conflict (id) do update set
  start_date                = excluded.start_date,
  end_date                  = excluded.end_date,
  min_per_week              = excluded.min_per_week,
  fee_per_missed_week_cents = excluded.fee_per_missed_week_cents,
  currency                  = excluded.currency,
  timezone                  = excluded.timezone;


-- =============================================================
-- 3. Helper functions
-- =============================================================

-- Today's date in the challenge's local timezone (Europe/Berlin).
-- Using this everywhere instead of `current_date` avoids the
-- 1-2h UTC drift that would otherwise let Sunday-night sessions
-- spill into Monday.
create or replace function public.today_local()
returns date
language sql stable
as $$
  select (current_timestamp at time zone 'Europe/Berlin')::date;
$$;

-- Monday (start) of the local current week.
create or replace function public.this_week_start()
returns date
language sql stable
as $$
  select date_trunc('week', public.today_local())::date;
$$;

-- True if the calling user is admin. SECURITY DEFINER so the
-- function can read profiles without tripping RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Auto-create a profile row whenever a new auth user is added.
-- Uses raw_user_meta_data.display_name / is_admin if provided,
-- otherwise falls back to the email's local part for display
-- and false for admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-stamp accepted_at / resolved_at on status transitions.
create or replace function public.handle_challenge_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and old.status = 'pending' and new.accepted_at is null then
    new.accepted_at = now();
  end if;
  if new.status = 'inactive' and old.status = 'active' and new.resolved_at is null then
    new.resolved_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_challenge_status_change on public.challenges;
create trigger on_challenge_status_change
  before update on public.challenges
  for each row execute function public.handle_challenge_status_change();


-- =============================================================
-- 4. Views (dashboard reads)
-- =============================================================

-- Per profile, this week's session count and whether the
-- threshold (default 3/week) has been hit yet.
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
where cc.id = 1
group by p.id, p.display_name, p.is_admin, cc.min_per_week;

-- Per profile, the count of CLOSED weeks where the threshold
-- was missed during the challenge window.
create or replace view public.v_missed_weeks
  with (security_invoker = true) as
with cfg as (
  select start_date, end_date, min_per_week from public.challenge_config where id = 1
),
weeks as (
  -- All week-starts (Mondays) inside the challenge that have
  -- already ended (Sunday < today_local).
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
group by p.id;

-- Per profile, total euros owed: missed-week fees + lost challenges.
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
  where c.loser_id = p.id and c.status = 'inactive'
) lc on true
where cc.id = 1;


-- =============================================================
-- 5. Row-Level Security
-- =============================================================

alter table public.profiles         enable row level security;
alter table public.activity_types   enable row level security;
alter table public.challenge_config enable row level security;
alter table public.entries          enable row level security;
alter table public.challenges       enable row level security;

-- profiles: any authenticated user reads all; no app writes
-- (admin updates via SQL Editor or a future admin-only flow).
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated using (true);

-- activity_types: read-only.
drop policy if exists "activity_types readable" on public.activity_types;
create policy "activity_types readable"
  on public.activity_types for select
  to authenticated using (true);

-- challenge_config: read-only.
drop policy if exists "challenge_config readable" on public.challenge_config;
create policy "challenge_config readable"
  on public.challenge_config for select
  to authenticated using (true);

-- entries: everyone authenticated reads all.
drop policy if exists "entries readable by authenticated" on public.entries;
create policy "entries readable by authenticated"
  on public.entries for select
  to authenticated using (true);

-- entries: users insert their own with date in the current local week.
drop policy if exists "users insert own current-week entries" on public.entries;
create policy "users insert own current-week entries"
  on public.entries for insert
  to authenticated with check (
    user_id = auth.uid()
    and activity_date >= public.this_week_start()
    and activity_date <  public.this_week_start() + interval '7 days'
  );

-- entries: users update their own current-week entries.
drop policy if exists "users update own current-week entries" on public.entries;
create policy "users update own current-week entries"
  on public.entries for update
  to authenticated using (
    user_id = auth.uid()
    and activity_date >= public.this_week_start()
    and activity_date <  public.this_week_start() + interval '7 days'
  ) with check (
    user_id = auth.uid()
    and activity_date >= public.this_week_start()
    and activity_date <  public.this_week_start() + interval '7 days'
  );

-- entries: users delete their own current-week entries.
drop policy if exists "users delete own current-week entries" on public.entries;
create policy "users delete own current-week entries"
  on public.entries for delete
  to authenticated using (
    user_id = auth.uid()
    and activity_date >= public.this_week_start()
    and activity_date <  public.this_week_start() + interval '7 days'
  );

-- challenges: everyone authenticated reads.
drop policy if exists "challenges readable by authenticated" on public.challenges;
create policy "challenges readable by authenticated"
  on public.challenges for select
  to authenticated using (true);

-- challenges: any authenticated user creates one as challenger; status starts pending.
drop policy if exists "users create challenges as challenger" on public.challenges;
create policy "users create challenges as challenger"
  on public.challenges for insert
  to authenticated with check (
    challenger_id = auth.uid()
    and status = 'pending'
    and challenger_id <> target_id
  );

-- challenges: target accepts (-> active) or declines (-> declined) a pending challenge aimed at them.
drop policy if exists "target accepts or declines pending challenge" on public.challenges;
create policy "target accepts or declines pending challenge"
  on public.challenges for update
  to authenticated using (
    target_id = auth.uid() and status = 'pending'
  ) with check (
    target_id = auth.uid() and status in ('active', 'declined')
  );

-- challenges: admin resolves an active challenge (-> inactive, with a loser_id).
drop policy if exists "admin resolves active challenges" on public.challenges;
create policy "admin resolves active challenges"
  on public.challenges for update
  to authenticated using (
    public.is_admin() and status = 'active'
  ) with check (
    public.is_admin() and status = 'inactive' and loser_id is not null
  );

-- challenges: challenger may cancel their own still-pending challenge.
drop policy if exists "challenger cancels pending challenge" on public.challenges;
create policy "challenger cancels pending challenge"
  on public.challenges for delete
  to authenticated using (
    challenger_id = auth.uid() and status = 'pending'
  );


-- =============================================================
-- 6. View access
-- =============================================================

grant select on public.v_current_week_progress to authenticated;
grant select on public.v_missed_weeks         to authenticated;
grant select on public.v_bucket_summary       to authenticated;


-- =============================================================
-- 7. Sanity check
-- =============================================================

select
  (select count(*) from public.activity_types) as activity_types,
  (select count(*) from public.challenge_config) as configs,
  public.today_local()      as today_local,
  public.this_week_start()  as week_start;
