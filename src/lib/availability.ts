import type { createClient } from "@/lib/supabase/server";

export type AvailabilityDay = {
  day_of_week: number;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
};

export const WEEKDAY_LABELS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** 0 (Sunday) .. 6 (Saturday), computed from the date alone (UTC-anchored) so it's not
 *  affected by which timezone the server happens to run in — same reasoning as the
 *  date-math helpers in lib/date.ts. */
export function dayOfWeekOf(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** A day with no rows at all is fully open (permissive default — instructors who've never
 *  set this up aren't suddenly unavailable everywhere). A closed row marks the whole day
 *  closed; otherwise a booking must fit entirely inside at least one of that day's open
 *  windows (a day can have several, e.g. a split shift of 10:00-11:00 and 14:00-15:00). */
export function isWithinAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  rows: AvailabilityDay[],
): boolean {
  const dayRows = rows.filter((r) => r.day_of_week === dayOfWeek);
  if (dayRows.length === 0) return true;
  if (dayRows.some((r) => r.is_closed)) return false;
  return dayRows.some((r) => startTime >= r.start_time! && endTime <= r.end_time!);
}

/** Reads the day rows posted by AvailabilityEditor: `closed_<day>` marks a day fully
 *  closed; otherwise `window_count_<day>` says how many `start_<day>_<i>`/`end_<day>_<i>`
 *  pairs to read. A day with no closed flag and no (complete) windows means "no opinion"
 *  — no rows are written for it, which isWithinAvailability treats as open all day. */
export function parseAvailabilityFormData(formData: FormData): AvailabilityDay[] {
  const rows: AvailabilityDay[] = [];
  for (let day = 0; day < 7; day++) {
    const closed = formData.get(`closed_${day}`) === "on";
    if (closed) {
      rows.push({ day_of_week: day, is_closed: true, start_time: null, end_time: null });
      continue;
    }

    const windowCount = Number(formData.get(`window_count_${day}`) || 0);
    for (let i = 0; i < windowCount; i++) {
      const start = String(formData.get(`start_${day}_${i}`) || "");
      const end = String(formData.get(`end_${day}_${i}`) || "");
      if (!start || !end) continue;
      if (end <= start) throw new Error(`ช่วงเวลาของวัน${WEEKDAY_LABELS[day]}: เวลาสิ้นสุดต้องหลังเวลาเริ่ม`);
      rows.push({ day_of_week: day, is_closed: false, start_time: start, end_time: end });
    }
  }
  return rows;
}

/** Full delete-then-reinsert of one instructor's weekly pattern — the table only ever
 *  holds at most 7 rows per instructor, so replacing them wholesale each save is simpler
 *  than diffing, matching how e.g. profiles.nicknames is fully replaced on every save. */
export async function saveAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  formData: FormData,
) {
  const rows = parseAvailabilityFormData(formData);

  const { error: deleteError } = await supabase
    .from("instructor_availability")
    .delete()
    .eq("instructor_id", instructorId);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("instructor_availability")
      .insert(rows.map((r) => ({ ...r, instructor_id: instructorId })));
    if (insertError) throw new Error(insertError.message);
  }
}
