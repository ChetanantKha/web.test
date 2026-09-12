import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PackageForm from "@/components/PackageForm";
import PackageRow from "@/components/PackageRow";
import type { CoursePackage } from "@/lib/types";

export default async function PackagesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const [{ data: packages }, { data: instructors }, { data: studentNameRows }, { data: orphanSessions }] =
    await Promise.all([
      supabase
        .from("course_packages")
        .select("*, profiles!instructor_id(full_name)")
        .order("status")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "instructor").eq("is_active", true).order("full_name"),
      supabase.from("sessions").select("student_name").not("student_name", "is", null),
      // sessions never linked to a package (e.g. scheduled before the package existed) —
      // used to top up each package's displayed count without touching used_sessions itself
      supabase.from("sessions").select("instructor_id, course_type, student_name").is("package_id", null).not("student_name", "is", null),
    ]);

  const studentNames = [...new Set((studentNameRows ?? []).map((s) => s.student_name).filter(Boolean))] as string[];
  const list = (packages ?? []) as CoursePackage[];

  const orphanKey = (instructorId: string, courseType: string, studentName: string) =>
    `${instructorId}|${courseType}|${studentName.trim().toLowerCase()}`;
  const orphanCounts = new Map<string, number>();
  for (const s of orphanSessions ?? []) {
    if (!s.student_name) continue;
    const key = orphanKey(s.instructor_id, s.course_type, s.student_name);
    orphanCounts.set(key, (orphanCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">จัดการคอร์สนักเรียน</h1>
        <p className="text-sm text-gray-500">
          ติดตามคอร์สแบบหลายครั้งที่นักเรียนซื้อไว้ — จองตารางที่ตรงชื่อ/ผู้สอน/ประเภทคอร์สจะหักจำนวนให้อัตโนมัติ
          ปรับตัวเลขเองได้ตลอด
        </p>
      </div>

      <PackageForm instructors={instructors ?? []} studentNames={studentNames} />

      <div className="space-y-3">
        {list.map((p) => (
          <PackageRow
            key={p.id}
            pkg={p}
            instructors={instructors ?? []}
            orphanCount={orphanCounts.get(orphanKey(p.instructor_id, p.course_type, p.student_name)) ?? 0}
          />
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีคอร์สที่บันทึกไว้</p>}
      </div>
    </div>
  );
}
