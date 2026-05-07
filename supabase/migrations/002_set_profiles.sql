-- =============================================================
-- Sport Challenge — set display names + admin flag.
-- Run this AFTER creating the four user accounts in
-- Supabase Dashboard -> Authentication -> Users.
-- Re-runnable.
-- =============================================================

update public.profiles set display_name = 'Marlo',  is_admin = true
  where id = (select id from auth.users where email = 'kuerner.marlo1@gmail.com');

update public.profiles set display_name = 'Moritz', is_admin = false
  where id = (select id from auth.users where email = 'moritz.scherzinger@gmx.net');

update public.profiles set display_name = 'Lukas',  is_admin = false
  where id = (select id from auth.users where email = 'lukaskubler3@gmail.com');

update public.profiles set display_name = 'Bruno',  is_admin = false
  where id = (select id from auth.users where email = 'bruno.kuerner@gmx.de');

-- Sanity check: should return 4 rows, exactly one with is_admin = true.
select id, display_name, is_admin from public.profiles order by display_name;
