import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import ExportCsvButton from "@/components/ExportCsvButton";
import CancelSessionButton from "@/components/CancelSessionButton";
import { getSessionStatus, statusLabel, type Session } from "@/lib/types";
import { formatThaiDate } from "@/lib/date";

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ instructor?: string; from?: string; to?: string; student?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const { instructor, from, to, student } = await searchParams;

  const [{ data: instructors }, { data: allStudentNames }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "instructor").order("full_name"),
    supabase.from("sessions").select("student_name").not("student_name", "is", null),
  ]);
  const studentNameOptions = [
    ...new Set((allStudentNames ?? []).map((s) => s.student_name).filter(Boolean)),
  ] as string[];

  // no date range by default: show every scheduled class, past or future, until the admin filters
  let query = supabase
    .from("sessions")
    .select("*, profiles!instructor_id(full_name)")
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (from) query = query.gte("session_date", from);
  if (to) query = query.lte("session_date", to);
  if (instructor) query = query.eq("instructor_id", instructor);
  if (student) query = query.ilike("student_name", `%${student}%`);

  const { data: sessions } = await query;
  const list = (sessions ?? []) as Session[];

  const totalRevenue = list.reduce((sum, s) => sum + s.price, 0);
  const totalPayout = list.reduce((sum, s) => sum + s.instructor_payout, 0);
  const margin = totalRevenue - totalPayout;

  const exportRows = list.map((s) => ({
    ผู้สอน: s.profiles?.full_name ?? "-",
    วันที่: formatThaiDate(s.session_date),
    เวลา: `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`,
    นักเรียน: s.student_name ?? "-",
    ราคา: s.price,
    ยอดจ่ายผู้สอน: s.instructor_payout,
    สถานะ: statusLabel[getSessionStatus(s)],
  }));
  exportRows.push({
    ผู้สอน: "",
    วันที่: "",
    เวลา: "",
    นักเรียน: "รวมทั้งหมด",
    ราคา: totalRevenue,
    ยอดจ่ายผู้สอน: totalPayout,
    สถานะ: "",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">รายการทั้งหมด</h1>

      <form className="flex flex-wrap items-end gap-2 text-sm">
        <div className="space-y-1">
          <label className="block">ผู้สอน</label>
          <select name="instructor" defaultValue={instructor ?? ""} className="rounded-lg border border-gray-300 px-2 py-1.5">
            <option value="">ทั้งหมด</option>
            {instructors?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block">ผู้เรียน</label>
          <input
            type="text"
            name="student"
            list="student-name-options"
            defaultValue={student ?? ""}
            placeholder="ค้นหาชื่อผู้เรียน"
            className="rounded-lg border border-gray-300 px-2 py-1.5"
          />
          <datalist id="student-name-options">
            {studentNameOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="block">จากวันที่</label>
          <input type="date" name="from" defaultValue={from ?? ""} className="rounded-lg border border-gray-300 px-2 py-1.5" />
        </div>
        <div className="space-y-1">
          <label className="block">ถึงวันที่</label>
          <input type="date" name="to" defaultValue={to ?? ""} className="rounded-lg border border-gray-300 px-2 py-1.5" />
        </div>
        <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5">
          กรอง
        </button>
        <div className="ml-auto">
          <ExportCsvButton filename="sessions-export.csv" rows={exportRows} />
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">รายรับรวม</p>
          <p className="text-lg font-semibold">{totalRevenue.toLocaleString()} บาท</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">รายจ่ายรวม (จ่ายผู้สอน)</p>
          <p className="text-lg font-semibold">{totalPayout.toLocaleString()} บาท</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">คงเหลือ</p>
          <p className={`text-lg font-semibold ${margin < 0 ? "text-red-600" : ""}`}>
            {margin.toLocaleString()} บาท
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {list.length > 0 ? (
          list.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {formatThaiDate(s.session_date)} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} ·{" "}
                  {s.profiles?.full_name ?? "-"}
                </p>
                <p className="text-gray-500">
                  นักเรียน {s.student_name || "-"} · ราคา {s.price.toLocaleString()} บาท · จ่ายผู้สอน{" "}
                  {s.instructor_payout.toLocaleString()} บาท
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge session={s} />
                <CancelSessionButton sessionId={s.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>
        )}
      </div>
    </div>
  );
}
