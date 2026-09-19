import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstructorRow from "@/components/InstructorRow";
import type { AvailabilityDay } from "@/lib/availability";

export default async function InstructorsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const [{ data: instructors }, { data: availability }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("instructor_availability").select("instructor_id, day_of_week, is_closed, start_time, end_time"),
  ]);

  const availabilityByInstructor = new Map<string, AvailabilityDay[]>();
  for (const row of availability ?? []) {
    const list = availabilityByInstructor.get(row.instructor_id) ?? [];
    list.push(row);
    availabilityByInstructor.set(row.instructor_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">จัดการผู้สอน</h1>
          <p className="text-sm text-gray-500">
            สร้างบัญชีล็อกอินใหม่ที่ Supabase Dashboard → Authentication → Add user แล้วโปรไฟล์จะปรากฏที่นี่โดยอัตโนมัติ
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {instructors?.map((p) => (
          <InstructorRow key={p.id} profile={p} availability={availabilityByInstructor.get(p.id) ?? []} />
        ))}
        {(!instructors || instructors.length === 0) && (
          <p className="text-sm text-gray-500">ยังไม่มีผู้ใช้ในระบบ</p>
        )}
      </div>
    </div>
  );
}
