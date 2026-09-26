import type { createClient } from "@/lib/supabase/server";

/** "Basic" here means the two generic entry-level course_types actually labeled
 *  "คอร์สพื้นฐาน..." in courseTypes.ts (hourly, ten_session) — the tier a student graduates
 *  OUT of into Basic Slalom (see GRADUATION_THRESHOLD_PERCENT in skillTricks.ts), not
 *  basic_slide/basic_slalom themselves, which are the next stage. */
const BASIC_COURSE_TYPES = ["hourly", "ten_session"];

/** Distinct student names already booked under a Basic course_type in the existing
 *  scheduling/package system — feeds the skill-checklist student list so an instructor can
 *  open a checklist for someone already enrolled without retyping their name. The checklist's
 *  own `students` table is independent of billing (see migration_student_skill_tracking.sql),
 *  so this is purely a listing convenience: findOrCreateStudent() in skillActions.ts turns a
 *  name from here into a real `students` row the first time someone opens it. */
export async function listBasicCourseStudentNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
  const [{ data: sessionNames }, { data: packageNames }] = await Promise.all([
    supabase.from("sessions").select("student_name").in("course_type", BASIC_COURSE_TYPES),
    supabase.from("course_packages").select("student_name").in("course_type", BASIC_COURSE_TYPES),
  ]);

  const names = new Set<string>();
  for (const row of sessionNames ?? []) {
    if (row.student_name?.trim()) names.add(row.student_name.trim());
  }
  for (const row of packageNames ?? []) {
    if (row.student_name?.trim()) names.add(row.student_name.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b, "th"));
}
