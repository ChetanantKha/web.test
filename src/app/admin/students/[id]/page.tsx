import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentDetailView from "@/components/StudentDetailView";
import type { SkillLevel } from "@/lib/skillTricks";

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const { id } = await params;

  const [{ data: student }, { data: checks }] = await Promise.all([
    supabase.from("students").select("id, full_name, parent_phone").eq("id", id).single(),
    supabase.from("student_skill_checks").select("trick_key, level, notes").eq("student_id", id),
  ]);
  if (!student) notFound();

  const ratings: [string, { level: SkillLevel; notes: string }][] = (checks ?? []).map((c) => [
    c.trick_key,
    { level: c.level as SkillLevel, notes: c.notes ?? "" },
  ]);

  return <StudentDetailView student={student} ratings={ratings} printHref={`/admin/students/${id}/print`} />;
}
