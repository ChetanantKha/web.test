import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shiftMonth, todayLocalISO, formatThaiMonthYear } from "@/lib/date";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const { month } = await searchParams;
  const todayIso = todayLocalISO();
  const selectedMonth = month || todayIso.slice(0, 7);
  const [year, mon] = selectedMonth.split("-").map(Number);

  const monthStart = `${selectedMonth}-01`;
  const prevMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const monthEnd = `${nextMonth}-01`;

  const { data: sessions } = await supabase
    .from("sessions")
    .select("session_date")
    .gte("session_date", monthStart)
    .lt("session_date", monthEnd);

  const countByDate = new Map<string, number>();
  for (const s of sessions ?? []) {
    countByDate.set(s.session_date, (countByDate.get(s.session_date) ?? 0) + 1);
  }

  const firstOfMonth = new Date(year, mon - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();

  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${selectedMonth}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">ปฏิทินตารางสอน</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin/calendar?month=${prevMonth}`} className="rounded-lg border border-gray-300 px-2 py-1">
            ‹ ก่อนหน้า
          </Link>
          <span className="font-medium">{formatThaiMonthYear(selectedMonth)}</span>
          <Link href={`/admin/calendar?month=${nextMonth}`} className="rounded-lg border border-gray-300 px-2 py-1">
            ถัดไป ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) =>
          date ? (
            <Link
              key={date}
              href={`/admin/calendar/${date}`}
              className={`flex h-20 flex-col items-start rounded-lg border p-2 text-sm hover:bg-gray-50 ${
                date === todayIso ? "border-gray-900" : "border-gray-200"
              }`}
            >
              <span>{Number(date.slice(-2))}</span>
              {countByDate.get(date) ? (
                <span className="mt-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                  {countByDate.get(date)} คลาส
                </span>
              ) : null}
            </Link>
          ) : (
            <div key={`empty-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
