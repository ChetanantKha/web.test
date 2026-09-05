-- Adds a fixed course-type field to sessions. Safe to run on the live project:
-- existing rows default to 'custom' (their price/payout stay exactly as they are).

alter table sessions
  add column if not exists course_type text
  check (course_type in ('hourly', 'ten_session', 'slalom', 'custom'))
  not null default 'custom';
