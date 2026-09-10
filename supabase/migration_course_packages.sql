create table if not exists course_packages (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  instructor_id uuid not null references profiles(id),
  course_type text not null check (course_type in ('ten_session', 'slalom_10')),
  total_sessions int not null default 10,
  used_sessions int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists course_packages_instructor_idx on course_packages (instructor_id);

alter table sessions add column if not exists package_id uuid references course_packages(id) on delete set null;

alter table course_packages enable row level security;

drop policy if exists "course_packages: instructor reads own, admin reads all" on course_packages;
drop policy if exists "course_packages: admin manages" on course_packages;

create policy "course_packages: instructor reads own, admin reads all"
  on course_packages for select
  using (instructor_id = auth.uid() or is_admin());

create policy "course_packages: admin manages"
  on course_packages for all
  using (is_admin())
  with check (is_admin());
