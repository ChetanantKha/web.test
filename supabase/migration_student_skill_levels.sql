-- Upgrades student_skill_checks from a binary pass/fail row to a 3-level proficiency rating
-- (1 = กำลังฝึก, 2 = ทำได้, 3 = ชำนาญ) plus an optional free-text note per trick.
-- Run this AFTER migration_student_skill_tracking.sql.

alter table student_skill_checks add column if not exists level smallint not null default 1;
alter table student_skill_checks add column if not exists notes text;

alter table student_skill_checks drop constraint if exists student_skill_checks_level_range;
alter table student_skill_checks add constraint student_skill_checks_level_range check (level between 1 and 3);

-- One-time backfill for rows created before levels existed: those were binary checked=passed,
-- which maps closer to level 2 (ทำได้) than the new-row default of 1 (กำลังฝึก) or assuming
-- full mastery (3). Safe to run once right after the ADD COLUMN above (every row is still at
-- the just-added default of 1 at this point).
update student_skill_checks set level = 2 where level = 1;
