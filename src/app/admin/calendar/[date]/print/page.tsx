import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buildSlotTimes, addMinutes } from "@/lib/slots";
import { formatThaiDate, shiftDate } from "@/lib/date";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";
import { dayOfWeekOf, isWithinAvailability, type AvailabilityDay } from "@/lib/availability";
import PrintButton from "@/components/PrintButton";
import type { Session } from "@/lib/types";

type Instructor = { id: string; full_name: string };

// Caps how wide a single printed sheet gets — beyond this, instructors spill onto
// an extra landscape page rather than squeezing columns unreadably thin. table-fixed
// keeps columns within the page either way; this only controls when it's worth
// trading narrower columns for staying on one sheet.
const INSTRUCTORS_PER_PAGE = 10;

// The grid's row unit. Bookings can start on any half hour (the time <input> allows
// any minute), so a coarser hourly grid mis-shows e.g. a 10:30-11:30 class as if it
// were the full 11:00-12:00 slot. 30 minutes is fine enough to align to that without
// doubling row count as badly as a per-minute grid would.
const GRID_SLOT_MINUTES = 30;

/** COURSE_TYPE_LABEL bakes the price into package-type labels (e.g. "Basic Slalom 10
 *  ครั้ง (800/คาบ)") for the admin-facing dropdowns — strip that parenthetical for the
 *  printed board, which shouldn't show pricing at all. */
function printCourseLabel(courseType: string): string {
  const label = COURSE_TYPE_LABEL[courseType as keyof typeof COURSE_TYPE_LABEL] ?? courseType;
  return label.replace(/\s*\([^)]*\)\s*$/, "");
}

const COLUMN_THEMES = [
  { header: "bg-blue-600", cell: "bg-blue-50", border: "border-blue-200" },
  { header: "bg-orange-500", cell: "bg-orange-50", border: "border-orange-200" },
  { header: "bg-rose-500", cell: "bg-rose-50", border: "border-rose-200" },
  { header: "bg-emerald-600", cell: "bg-emerald-50", border: "border-emerald-200" },
  { header: "bg-violet-600", cell: "bg-violet-50", border: "border-violet-200" },
  { header: "bg-amber-500", cell: "bg-amber-50", border: "border-amber-200" },
];

/** Splits into as few pages as `maxPerPage` allows, spreading instructors evenly across
 *  them — e.g. 7 instructors at maxPerPage=6 becomes two pages of 4+3, not a nearly-empty
 *  lone-instructor second page (naive fixed-size chunking would do 6+1). */
function balancedChunk<T>(items: T[], maxPerPage: number): T[][] {
  if (items.length === 0) return [];
  const pageCount = Math.ceil(items.length / maxPerPage);
  const perPage = Math.ceil(items.length / pageCount);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));
  return chunks;
}

type GridCell =
  | { render: false }
  | { render: true; rowSpan: number; kind: "session"; session: Session }
  | { render: true; rowSpan: number; kind: "open" | "closed" };

/** One entry per row for a single instructor column: a session, or a run of consecutive
 *  closed slots, collapses into one rowSpan'd cell on its first row, `render: false` on
 *  the rows it covers after that (so the <table> doesn't double-paint them). Open ("ว่าง")
 *  slots are deliberately never merged — each stays its own single-row cell so its border
 *  is a real per-row boundary the browser positions itself, always exactly matching the
 *  time column no matter how tall any other row ends up rendering (a fixed-height/rowSpan
 *  trick for a "ruled line" here would drift out of sync the moment a neighboring cell's
 *  content wraps to an extra line). A slot outside the instructor's declared availability
 *  shows "closed" instead of "open" so the board makes clear they're not taking bookings
 *  then, not just that nothing's booked yet. */
function buildColumn(
  instructorId: string,
  slotTimes: string[],
  sessions: Session[],
  dayOfWeek: number,
  availability: AvailabilityDay[],
): GridCell[] {
  const hasSessionAt = (slot: string) =>
    sessions.some(
      (sess) => sess.instructor_id === instructorId && slot >= sess.start_time.slice(0, 5) && slot < sess.end_time.slice(0, 5),
    );
  const isClosedAt = (slot: string) =>
    !isWithinAvailability(dayOfWeek, slot, addMinutes(slot, GRID_SLOT_MINUTES), availability);

  const cells: GridCell[] = [];
  let skipRemaining = 0;
  for (let i = 0; i < slotTimes.length; i++) {
    if (skipRemaining > 0) {
      cells.push({ render: false });
      skipRemaining--;
      continue;
    }
    const slot = slotTimes[i];
    const s = sessions.find(
      (sess) =>
        sess.instructor_id === instructorId &&
        slot >= sess.start_time.slice(0, 5) &&
        slot < sess.end_time.slice(0, 5),
    );
    if (s) {
      let span = 1;
      while (i + span < slotTimes.length && slotTimes[i + span] < s.end_time.slice(0, 5)) span++;
      cells.push({ render: true, rowSpan: span, kind: "session", session: s });
      skipRemaining = span - 1;
      continue;
    }

    if (!isClosedAt(slot)) {
      cells.push({ render: true, rowSpan: 1, kind: "open" });
      continue;
    }

    let span = 1;
    while (i + span < slotTimes.length && !hasSessionAt(slotTimes[i + span]) && isClosedAt(slotTimes[i + span])) {
      span++;
    }
    cells.push({ render: true, rowSpan: span, kind: "closed" });
    skipRemaining = span - 1;
  }
  return cells;
}

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

  const [{ data: settings }, { data: instructors }, { data: sessions }, { data: availability }] = await Promise.all([
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
    supabase.from("instructor_availability").select("instructor_id, day_of_week, is_closed, start_time, end_time"),
  ]);

  const dayOfWeek = dayOfWeekOf(date);
  const availabilityByInstructor = new Map<string, AvailabilityDay[]>();
  for (const row of availability ?? []) {
    const list = availabilityByInstructor.get(row.instructor_id) ?? [];
    list.push(row);
    availabilityByInstructor.set(row.instructor_id, list);
  }

  const slotTimes = buildSlotTimes(
    settings?.business_start?.slice(0, 5) ?? "06:00",
    settings?.business_end?.slice(0, 5) ?? "21:00",
    GRID_SLOT_MINUTES,
  );

  const activeInstructors = (instructors ?? []) as Instructor[];
  const daySessions = (sessions ?? []) as Session[];
  const instructorPages = balancedChunk(activeInstructors, INSTRUCTORS_PER_PAGE);
  // Keyed by instructor id (not page-local index) so a column keeps the same color
  // regardless of which page it lands on after balancedChunk's variable page sizes.
  const colorIndexById = new Map(activeInstructors.map((ins, idx) => [ins.id, idx]));

  return (
    <div className="space-y-6 print:space-y-0">
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
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            ก่อนกดพิมพ์: เปิดตัวเลือก &quot;พิมพ์พื้นหลัง / Background graphics&quot; ในหน้าต่างพิมพ์ ไม่งั้นสีจะหาย
          </p>
          <PrintButton />
        </div>
      </div>

      {activeInstructors.length === 0 ? (
        <p className="text-center text-sm text-gray-500">ยังไม่มีครูผู้สอนที่ใช้งานอยู่</p>
      ) : (
        instructorPages.map((pageInstructors, pageIndex) => {
          const columns = pageInstructors.map((ins) =>
            buildColumn(ins.id, slotTimes, daySessions, dayOfWeek, availabilityByInstructor.get(ins.id) ?? []),
          );

          return (
            <div
              key={pageIndex}
              className={`space-y-4 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6 print:p-4 ${
                pageIndex > 0 ? "print:break-before-page" : ""
              }`}
            >
              <div className="relative flex items-center justify-center gap-4 overflow-hidden py-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-6 -top-8 h-28 w-28 rounded-full bg-blue-200/50 blur-2xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-orange-200/50 blur-2xl"
                />
                <Image
                  src="/logo.jpg"
                  alt="T-STAR Academy"
                  width={64}
                  height={64}
                  className="relative rounded-2xl shadow-md"
                />
                <div className="relative rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 shadow-md">
                  <h1 className="text-xl font-bold whitespace-nowrap text-white sm:text-2xl">
                    ตารางสอน T-STAR Academy
                  </h1>
                </div>
              </div>
              <p className="text-center text-lg font-medium text-blue-950">{formatThaiDate(date)}</p>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl border border-blue-950/20">
                  <thead>
                    <tr>
                      <th className="w-24 bg-blue-950 p-2 text-sm font-semibold text-white sm:w-28">เวลา</th>
                      {pageInstructors.map((ins) => {
                        const theme = COLUMN_THEMES[colorIndexById.get(ins.id)! % COLUMN_THEMES.length];
                        return (
                          <th key={ins.id} className={`p-2 text-sm font-semibold text-white ${theme.header}`}>
                            {ins.full_name}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {slotTimes.map((slot, rowIndex) => (
                      <tr key={slot}>
                        <td className="h-11 border-b border-gray-300 bg-blue-50 p-2 text-center text-xs font-medium text-blue-950 sm:text-sm">
                          {slot}-{addMinutes(slot, GRID_SLOT_MINUTES)}
                        </td>
                        {pageInstructors.map((ins, i) => {
                          const cell = columns[i][rowIndex];
                          if (!cell.render) return null;
                          const theme = COLUMN_THEMES[colorIndexById.get(ins.id)! % COLUMN_THEMES.length];
                          const s = cell.kind === "session" ? cell.session : null;
                          return (
                            <td
                              key={ins.id}
                              rowSpan={cell.rowSpan}
                              className={`h-11 border-b border-l border-gray-300 p-1.5 text-center text-[11px] leading-snug sm:text-xs ${
                                s ? theme.cell : cell.kind === "closed" ? "bg-gray-100" : "bg-white"
                              }`}
                            >
                              {/* Same centered, plain-text shape for every state — only the background
                                  color tells booked/closed/open apart, so the grid reads as one
                                  consistent surface instead of three differently-styled widgets. */}
                              <div className="flex h-full flex-col items-center justify-center gap-0.5">
                                {s ? (
                                  <>
                                    <p className="w-full truncate font-medium text-gray-800">{printCourseLabel(s.course_type)}</p>
                                    {s.student_name ? <p className="w-full truncate text-gray-600">{s.student_name}</p> : null}
                                  </>
                                ) : cell.kind === "closed" ? (
                                  <p className="font-medium text-gray-600">ปิดรับสอน</p>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
