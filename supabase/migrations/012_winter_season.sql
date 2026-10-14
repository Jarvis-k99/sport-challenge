-- =============================================================
-- Sport Challenge — start the Winter 2026/27 season.
-- Run AFTER 011_season_archive.sql.
--
-- Same rules as Season 1 (≥3 sessions/week, €5 per missed week);
-- only the dates and the season name change. All views recompute
-- on the next page load. Idempotent.
-- =============================================================

update public.challenge_config
   set season_name = 'Winter 2026/27',
       start_date  = date '2026-10-12',   -- Monday
       end_date    = date '2027-02-28'    -- Sunday (20 full weeks)
 where id = 1;

-- Sanity check: the bucket must be empty (nothing has closed yet).
select cc.season_name, cc.start_date, cc.end_date,
       (select coalesce(sum(total_owed_cents), 0) from public.v_bucket_summary) as bucket_cents,
       (select count(*) from public.season_archive) as archived_seasons
  from public.challenge_config cc
 where cc.id = 1;
