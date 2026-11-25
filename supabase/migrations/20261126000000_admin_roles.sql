-- Admin status is stored server-side. New accounts are always ordinary users.
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id and role = 'user');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

-- To promote the first administrator, register their email on the site, then run
-- the documented UPDATE in SUPABASE-SETUP.md from the Supabase SQL Editor.
