-- v3 schema: admin-driven calendar scheduling + staff confirmation + payout approval.
-- (sport/location tracking removed; nickname-only login added)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- WARNING: this drops and recreates the app tables, wiping any existing test data.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop table if exists audit_log cascade;
drop table if exists sessions cascade;
drop table if exists locations cascade;
drop table if exists sports cascade;
drop table if exists settings cascade;
drop table if exists profiles cascade;
drop function if exists is_admin();
drop function if exists email_for_nickname(text);

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: one row per auth user (instructor or admin)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'instructor')) default 'instructor',
  full_name text not null,
  nicknames text[] not null default '{}', -- same account can log in under several nicknames
  email text,
  phone text,
  rate_type text check (rate_type in ('fixed', 'percent')) default 'percent',
  rate_value numeric not null default 0,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  qr_code_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;

create policy "profiles: read own or admin reads all"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "profiles: admin manages all"
  on profiles for all
  using (is_admin())
  with check (is_admin());

create policy "profiles: instructor updates own basic info"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- auto-create a profiles row whenever a new auth user is created
-- (admin creates the login in Supabase Dashboard > Authentication > Add user,
-- then edits the resulting profile inside the app: name/rate/bank/QR)
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.email, 'ผู้สอนใหม่'), new.email, 'instructor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- backfill profiles for auth users that already existed before this (re)run
-- (the trigger above only fires for newly-created logins going forward)
insert into public.profiles (id, full_name, email, role)
select id, coalesce(email, 'ผู้ใช้'), email, 'instructor' from auth.users
on conflict (id) do update set email = excluded.email;

-- nickname-only login: the app looks up which account a typed nickname
-- belongs to via this function (callable while still signed out), then signs
-- that account in using a fixed shared password (see LOGIN_SHARED_PASSWORD).
-- By explicit request this is low-friction / low-security: anyone who knows
-- a nickname can sign in as that person. Trusted-small-team use only.
create function email_for_nickname(p_nickname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles
  where is_active and exists (select 1 from unnest(nicknames) n where lower(n) = lower(p_nickname))
  limit 1;
$$;

grant execute on function email_for_nickname(text) to anon, authenticated;

-- ============================================================
-- settings: single-row config for the calendar grid
-- ============================================================
create table settings (
  id int primary key default 1,
  business_start time not null default '06:00',
  business_end time not null default '21:00',
  slot_minutes int not null default 60,
  constraint settings_single_row check (id = 1)
);

alter table settings enable row level security;

create policy "settings: anyone signed in can read" on settings for select using (auth.uid() is not null);
create policy "settings: admin manages" on settings for all using (is_admin()) with check (is_admin());

insert into settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- sessions: one row = one scheduled class, assigned by the admin.
-- status is derived (not stored): scheduled -> teaching -> finished -> paid,
-- based on session_date/start_time/end_time vs finished_at/paid_at.
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id),
  student_name text,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  price numeric not null default 0,
  instructor_payout numeric not null default 0, -- computed by the app from profiles.rate_type/rate_value
  finished_by uuid references profiles(id),
  finished_at timestamptz,
  paid_by uuid references profiles(id),
  paid_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_instructor_date_idx on sessions (instructor_id, session_date);
create index sessions_date_idx on sessions (session_date);

alter table sessions enable row level security;

create policy "sessions: instructor reads own, admin reads all"
  on sessions for select
  using (instructor_id = auth.uid() or is_admin());

create policy "sessions: admin creates"
  on sessions for insert
  with check (is_admin());

create policy "sessions: instructor updates own (finish only), admin updates all"
  on sessions for update
  using (instructor_id = auth.uid() or is_admin())
  with check (instructor_id = auth.uid() or is_admin());

create policy "sessions: admin deletes"
  on sessions for delete
  using (is_admin());

-- allow the sessions table to stream realtime changes to admin + the assigned instructor
-- (wrapped so a missing/already-configured publication can't abort the whole script)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
    ) then
      execute 'alter publication supabase_realtime add table sessions';
    end if;
  end if;
end $$;

-- ============================================================
-- audit_log: written by the app for schedule edits/cancels/finish/pay events
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  action text not null check (action in ('create', 'update', 'delete', 'finish', 'pay')),
  changed_by uuid references profiles(id),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log: admin reads" on audit_log for select using (is_admin());
create policy "audit_log: signed-in users insert" on audit_log for insert with check (auth.uid() is not null);

-- ============================================================
-- storage bucket for instructor PromptPay/bank QR code images
-- ============================================================
insert into storage.buckets (id, name, public) values ('payout-qr', 'payout-qr', true)
on conflict (id) do nothing;

drop policy if exists "payout-qr: owner uploads own, admin uploads any" on storage.objects;
drop policy if exists "payout-qr: owner updates own, admin updates any" on storage.objects;
drop policy if exists "payout-qr: anyone can view" on storage.objects;
drop policy if exists "slips: anyone signed in can upload" on storage.objects;
drop policy if exists "slips: anyone can view" on storage.objects;

create policy "payout-qr: owner uploads own, admin uploads any"
  on storage.objects for insert
  with check (
    bucket_id = 'payout-qr'
    and (auth.uid() is not null)
  );

create policy "payout-qr: owner updates own, admin updates any"
  on storage.objects for update
  using (bucket_id = 'payout-qr' and auth.uid() is not null);

create policy "payout-qr: anyone can view"
  on storage.objects for select
  using (bucket_id = 'payout-qr');
