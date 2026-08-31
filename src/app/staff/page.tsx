import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import StaffPayoutForm from "@/components/StaffPayoutForm";
import type { Profile, Session } from "@/lib/types";
import { formatThaiDate } from "@/lib/date";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/admin");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("instructor_id", user.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  const list = (sessions ?? []) as Session[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">สวัสดี {profile?.full_name ?? ""}</h1>
        <p className="text-sm text-gray-500">ตารางสอนทั้งหมดของฉัน (แอดมินเป็นผู้จัดตารางให้)</p>
      </div>

      {profile && <StaffPayoutForm profile={profile as Profile} />}

      <div className="space-y-2">
        {list.length > 0 ? (
          list.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {formatThaiDate(s.session_date)} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                  </p>
                  <p className="text-gray-500">นักเรียน {s.student_name || "-"}</p>
                  <p className="text-gray-500">ยอดที่จะได้รับ {s.instructor_payout.toLocaleString()} บาท</p>
                </div>
                <StatusBadge session={s} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">ยังไม่มีตารางสอน</p>
        )}
      </div>
    </div>
  );
}
