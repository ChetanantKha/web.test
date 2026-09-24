import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PackageAuditList from "@/components/PackageAuditList";
import type { CoursePackage, Session } from "@/lib/types";

/** "basic_slalom_10" -> "basic_slalom" — the single-session course type that's the same
 *  discipline as a package type, just picked by mistake instead of the "_10" version. */
function familyOf(courseType: string) {
  return courseType.replace(/_10$/, "");
}

function normName(name: string | null) {
  return (name ?? "").trim().toLowerCase();
}

export default async function PackageAuditPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const [{ data: packages }, { data: sessions }, { data: profiles }, { data: recentAuditLog }] = await Promise.all([
    supabase.from("course_packages").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("audit_log").select("*").eq("action", "update").order("changed_at", { ascending: false }).limit(100),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const allPackages = (packages ?? []) as CoursePackage[];
  const allSessions = (sessions ?? []) as Session[];

  const findings = allPackages
    .map((pkg) => {
      const family = familyOf(pkg.course_type);
      const candidates = allSessions.filter(
        (s) =>
          s.instructor_id === pkg.instructor_id &&
          normName(s.student_name) === normName(pkg.student_name) &&
          !s.package_id &&
          (s.course_type === pkg.course_type || s.course_type === family),
      );
      return {
        pkg,
        instructorName: nameById.get(pkg.instructor_id) ?? "-",
        candidates: candidates.sort((a, b) => a.session_date.localeCompare(b.session_date)),
      };
    })
    .filter((f) => f.candidates.length > 0);

  const fixHistory = (recentAuditLog ?? [])
    .filter((row) => (row.new_data as Record<string, unknown> | null)?._source === "package_audit_fix")
    .slice(0, 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">ตรวจสอบคอร์สที่นับไม่ครบ</h1>
          <p className="text-sm text-gray-500">
            หาคาบเรียนที่ชื่อนักเรียน + ผู้สอน + ประเภทคอร์ส ตรงกับคอร์สแพ็กเกจที่มีอยู่ แต่ไม่ได้ถูกเชื่อม/นับเข้าคอร์ส
            (เช่น จองเป็นรายชั่วโมงไปโดยที่จริงๆ ควรหักจากคอร์สแพ็กเกจ) หรือคอร์สที่ตัวเลขคลาดเคลื่อนจากคาบที่เชื่อมไว้จริง
            (เช่น คอร์สแบบคิดตามชั่วโมง แต่เคยถูกนับเป็น 1 ต่อคาบมาก่อน) แก้แค่ &quot;จำนวนที่นับ&quot; เท่านั้น
            ราคา/ยอดจ่ายผู้สอนของคาบเดิมจะไม่ถูกแก้ย้อนหลัง
          </p>
        </div>
        <Link href="/admin/packages" className="text-sm underline">
          กลับหน้าคอร์ส
        </Link>
      </div>

      <PackageAuditList
        findings={findings}
        fixHistory={fixHistory}
        allPackages={allPackages.map((p) => ({
          id: p.id,
          student_name: p.student_name,
          course_type: p.course_type,
          total_sessions: p.total_sessions,
        }))}
      />
    </div>
  );
}
