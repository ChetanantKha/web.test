-- widen sessions.course_type to allow the new course types
alter table sessions drop constraint if exists sessions_course_type_check;
alter table sessions
  add constraint sessions_course_type_check
  check (course_type in (
    'hourly', 'ten_session', 'slalom', 'slalom_10',
    'nanny', 'nanny_10',
    'basic_slide', 'basic_slide_10',
    'basic_slalom', 'basic_slalom_10',
    'skate_dance', 'skate_dance_10',
    'custom'
  ));

-- widen course_packages.course_type the same way (package-eligible types only)
alter table course_packages drop constraint if exists course_packages_course_type_check;
alter table course_packages
  add constraint course_packages_course_type_check
  check (course_type in (
    'ten_session', 'slalom_10', 'nanny_10', 'basic_slide_10', 'basic_slalom_10', 'skate_dance_10'
  ));

-- lets a specific student+instructor package stay on a locked-in flat rate even after
-- FIXED_COURSE_TYPES pricing changes for everyone else
alter table course_packages add column if not exists legacy_price numeric;
alter table course_packages add column if not exists legacy_payout numeric;

-- new audit_log action for reassigning a class to a substitute instructor
alter table audit_log drop constraint if exists audit_log_action_check;
alter table audit_log
  add constraint audit_log_action_check
  check (action in ('create', 'update', 'delete', 'finish', 'pay', 'substitute'));
