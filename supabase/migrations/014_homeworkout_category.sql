-- =============================================================
-- Sport Challenge — replace the "Other" activity with "Homeworkout".
--
-- Renames activity type 9 in place (same id), so existing entries keep
-- pointing at it: past "Other" sessions now show up as Homeworkout.
-- The pie-chart colour for id 9 lives in src/lib/activity-colors.ts.
-- Idempotent.
-- =============================================================

update public.activity_types
   set name  = 'Homeworkout',
       emoji = '🤸'
 where id = 9;

select id, name, emoji, sort_order,
       (select count(*) from public.entries e where e.activity_type_id = 9) as entries_using_it
  from public.activity_types
 order by sort_order;
