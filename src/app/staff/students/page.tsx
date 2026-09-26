import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentListView from "@/components/StudentListView";
import { listBasicCourseStudentNames, listStudentNamesTaughtByInstructor } from "@/lib/basicCourseStudents";
import type { SkillLevel } from "@/lib/skillTricks";

export default async function StaffStudentsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [{ data: students }, { data: checks }, basicNames, myNames] = await Promise.all([
    supabase.from("students").select("id, full_name").order("full_name"),
    supabase.from("student_skill_checks").select("student_id, trick_key, level"),
    listBasicCourseStudentNames(supabase),
    listStudentNamesTaughtByInstructor(supabase, user.id),
  ]);

  const levelsByStudent = new Map<string, Map<string, SkillLevel>>();
  for (const c of checks ?? []) {
    const map = levelsByStudent.get(c.student_id) ?? new Map<string, SkillLevel>();
    map.set(c.trick_key, c.level as SkillLevel);
    levelsByStudent.set(c.student_id, map);
  }

  // Instructors only see students they've actually taught (any course_type) — admin still
  // sees everyone (see /admin/students), this page is instructor-scoped by request.
  const myStudents = (students ?? []).filter((s) => myNames.has(s.full_name.trim().toLowerCase()));

  const existingNames = new Set(myStudents.map((s) => s.full_name.trim().toLowerCase()));
  const pendingNames = basicNames.filter((n) => myNames.has(n.toLowerCase()) && !existingNames.has(n.toLowerCase()));

  return <StudentListView basePath="/staff/students" students={myStudents} levelsByStudent={levelsByStudent} pendingNames={pendingNames} />;
}
