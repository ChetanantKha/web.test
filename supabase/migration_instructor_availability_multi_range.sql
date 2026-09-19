-- Follow-up to migration_instructor_availability.sql: lets a day have more than one
-- open window (e.g. 10:00-11:00 and 14:00-15:00 the same day) instead of exactly one
-- row per instructor+day_of_week.
alter table instructor_availability
  drop constraint if exists instructor_availability_instructor_id_day_of_week_key;
