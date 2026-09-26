import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentListView from "@/components/StudentListView";
import { listBasicCourseStudentNames } from "@/lib/basicCourseStudents";
import type { SkillLevel } from "@/lib/skillTricks";

export default async function AdminStudentsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const [{ data: students }, { data: checks }, basicNames] = await Promise.all([
    supabase.from("students").select("id, full_name").order("full_name"),
    supabase.from("student_skill_checks").select("student_id, trick_key, level"),
    listBasicCourseStudentNames(supabase),
  ]);

  const levelsByStudent = new Map<string, Map<string, SkillLevel>>();
  for (const c of checks ?? []) {
    const map = levelsByStudent.get(c.student_id) ?? new Map<string, SkillLevel>();
    map.set(c.trick_key, c.level as SkillLevel);
    levelsByStudent.set(c.student_id, map);
  }

  const existingNames = new Set((students ?? []).map((s) => s.full_name.trim().toLowerCase()));
  const pendingNames = basicNames.filter((n) => !existingNames.has(n.toLowerCase()));

  return (
    <StudentListView basePath="/admin/students" students={students ?? []} levelsByStudent={levelsByStudent} pendingNames={pendingNames} />
  );
}
