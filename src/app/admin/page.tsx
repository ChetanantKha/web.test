import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import AdminConfirmFinishedButton from "@/components/AdminConfirmFinishedButton";
import CancelSessionButton from "@/components/CancelSessionButton";
import { getSessionStatus, type Session } from "@/lib/types";
import { todayLocalISO, formatThaiDate } from "@/lib/date";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const today = todayLocalISO();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, profiles!instructor_id(full_name)")
    .eq("session_date", today)
    .order("start_time", { ascending: true });

  const list = (sessions ?? []) as Session[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">สถานะวันนี้ ({formatThaiDate(today)})</h1>
          <p className="text-sm text-gray-500">ภาพรวมทุกคลาสของวันนี้แบบเรียลไทม์</p>
        </div>
        <Link
          href={`/admin/calendar/${today}`}
          className="rounded-lg bg-gradient-to-r from-rose-500 to-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          + จัดตารางวันนี้
        </Link>
      </div>

      <div className="space-y-2">
        {list.length > 0 ? (
          list.map((s) => {
            const status = getSessionStatus(s);
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} · {s.profiles?.full_name ?? "-"}
                  </p>
                  <p className="text-gray-500">
                    นักเรียน {s.student_name || "-"} · ยอดจ่ายผู้สอน{" "}
                    {s.instructor_payout.toLocaleString()} บาท
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge session={s} />
                  {status === "teaching" && <AdminConfirmFinishedButton sessionId={s.id} />}
                  <CancelSessionButton sessionId={s.id} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">วันนี้ยังไม่มีตารางสอน</p>
        )}
      </div>
    </div>
  );
}
