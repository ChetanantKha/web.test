import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstructorRow from "@/components/InstructorRow";

export default async function InstructorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const { data: instructors } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

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
        {instructors?.map((p) => <InstructorRow key={p.id} profile={p} />)}
        {(!instructors || instructors.length === 0) && (
          <p className="text-sm text-gray-500">ยังไม่มีผู้ใช้ในระบบ</p>
        )}
      </div>
    </div>
  );
}
