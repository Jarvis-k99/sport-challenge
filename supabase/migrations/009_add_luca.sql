-- =============================================================
-- Sport Challenge — set Luca's display name.
-- Run AFTER creating his Auth account in the Supabase Dashboard.
-- The handle_new_user trigger auto-creates the profile row with
-- display_name defaulted to the email's local part; this UPDATE
-- replaces it with a clean first-name. Idempotent.
-- =============================================================

update public.profiles
   set display_name = 'Luca',
       is_admin     = false
 where id = (
   select id from auth.users where email = 'luca.miskovic.lm@gmail.com'
 );

-- Sanity check: should return 5 rows, exactly one with is_admin = true.
select id, display_name, is_admin
  from public.profiles
 order by display_name;
