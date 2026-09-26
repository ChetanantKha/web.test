-- Student skill checklist + RPG-style stat tracking (Basic Inline Skating curriculum).
-- Independent of course_type/billing — a student can be checked off regardless of which
-- course_type they're paying under. trick_key values are validated against
-- src/lib/skillTricks.ts in the app layer, not a DB check constraint, so new tricks/
-- curricula can be added without a migration.

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  parent_phone text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists student_skill_checks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  trick_key text not null,
  checked_by uuid not null references profiles(id),
  checked_at timestamptz not null default now(),
  unique (student_id, trick_key)
);

create index if not exists student_skill_checks_student_idx on student_skill_checks (student_id);

alter table students enable row level security;
alter table student_skill_checks enable row level security;

drop policy if exists "students: signed-in users read" on students;
drop policy if exists "students: signed-in users write" on students;
drop policy if exists "student_skill_checks: signed-in users read" on student_skill_checks;
drop policy if exists "student_skill_checks: signed-in users write" on student_skill_checks;

-- Any logged-in instructor or admin can read/write — checklist data is collaborative
-- teaching notes, not payroll, so there's no reason to scope it to "own students only"
-- (a student is commonly taught by several instructors over time). Matches the
-- "settings: anyone signed in can read" precedent already used elsewhere in this schema.
create policy "students: signed-in users read"
  on students for select using (auth.uid() is not null);
create policy "students: signed-in users write"
  on students for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "student_skill_checks: signed-in users read"
  on student_skill_checks for select using (auth.uid() is not null);
create policy "student_skill_checks: signed-in users write"
  on student_skill_checks for all using (auth.uid() is not null) with check (auth.uid() is not null);
