alter table sessions drop constraint if exists sessions_course_type_check;

alter table sessions
  add constraint sessions_course_type_check
  check (course_type in ('hourly', 'ten_session', 'slalom', 'slalom_10', 'custom'));
