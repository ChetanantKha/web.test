-- Lets each instructor (or admin, on their behalf) declare a recurring weekly
-- availability pattern: which days they teach and during what hours. A day with
-- no row is treated as fully open (permissive default) so existing instructors
-- who've never touched this aren't suddenly flagged as unavailable everywhere.
-- Run this in the Supabase SQL Editor after schema.sql.

create table instructor_availability (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday .. 6 = Saturday (matches JS Date#getDay())
  is_closed boolean not null default false,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  unique (instructor_id, day_of_week),
  constraint instructor_availability_time_or_closed check (
    (is_closed and start_time is null and end_time is null) or
    (not is_closed and start_time is not null and end_time is not null and end_time > start_time)
  )
);

alter table instructor_availability enable row level security;

create policy "instructor_availability: instructor reads own, admin reads all"
  on instructor_availability for select
  using (instructor_id = auth.uid() or is_admin());

create policy "instructor_availability: instructor writes own, admin writes all"
  on instructor_availability for all
  using (instructor_id = auth.uid() or is_admin())
  with check (instructor_id = auth.uid() or is_admin());

-- Marks a session as booked outside the instructor's declared availability, and
-- tracks how the instructor responded. NULL confirmed_at + NULL rejected_at while
-- outside_availability is true means "pending — instructor hasn't answered yet".
alter table sessions
  add column outside_availability boolean not null default false,
  add column instructor_confirmed_at timestamptz,
  add column instructor_rejected_at timestamptz;
