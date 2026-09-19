import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildSlotTimes } from "@/lib/slots";
import { formatThaiDate, shiftDate } from "@/lib/date";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";
import PrintButton from "@/components/PrintButton";
import type { Session } from "@/lib/types";

export default async function CalendarPrintPage({ params }: { params: Promise<{ date: string }> }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const { date } = await params;

  const [{ data: settings }, { data: instructors }, { data: sessions }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "instructor")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("sessions")
      .select("*, profiles!instructor_id(full_name)")
      .eq("session_date", date)
      .order("start_time"),
  ]);

  const slotTimes = buildSlotTimes(
    settings?.business_start?.slice(0, 5) ?? "06:00",
    settings?.business_end?.slice(0, 5) ?? "21:00",
    settings?.slot_minutes ?? 60,
  );

  const activeInstructors = instructors ?? [];
  const daySessions = (sessions ?? []) as Session[];

  const sessionAt = (instructorId: string, slot: string) =>
    daySessions.find(
      (s) => s.instructor_id === instructorId && slot >= s.start_time.slice(0, 5) && slot < s.end_time.slice(0, 5),
    );

  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/admin/calendar/${shiftDate(date, -1)}/print`}
            className="rounded-lg border border-gray-300 px-2 py-1"
          >
            ‹ วันก่อนหน้า
          </Link>
          <Link
            href={`/admin/calendar/${shiftDate(date, 1)}/print`}
            className="rounded-lg border border-gray-300 px-2 py-1"
          >
            วันถัดไป ›
          </Link>
          <Link href={`/admin/calendar/${date}`} className="text-sm underline">
            กลับไปแก้ไขตาราง
          </Link>
        </div>
        <PrintButton />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold">ตารางสอน T-STAR Academy</h1>
        <p className="text-lg">{formatThaiDate(date)}</p>
      </div>

      {activeInstructors.length === 0 ? (
        <p className="text-center text-sm text-gray-500">ยังไม่มีครูผู้สอนที่ใช้งานอยู่</p>
      ) : (
        <div className="space-y-3 print:space-y-2">
          {slotTimes.map((slot) => (
            <div
              key={slot}
              className="rounded-xl border border-gray-300 p-3 print:break-inside-avoid print:rounded-none print:border-black"
            >
              <p className="text-lg font-semibold">{slot} น.</p>
              <ul className="mt-1 space-y-1">
                {activeInstructors.map((ins) => {
                  const s = sessionAt(ins.id, slot);
                  return (
                    <li
                      key={ins.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 text-base"
                    >
                      <span className="font-medium">{ins.full_name}</span>
                      {s ? (
                        <span className="text-right">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800 print:bg-transparent print:font-bold">
                            เต็ม
                          </span>{" "}
                          {COURSE_TYPE_LABEL[s.course_type as keyof typeof COURSE_TYPE_LABEL] ?? s.course_type}
                          {s.student_name ? ` · นักเรียน ${s.student_name}` : ""} (
                          {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-800 print:bg-transparent print:font-bold">
                          ว่าง
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
