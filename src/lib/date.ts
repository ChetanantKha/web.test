/**
 * YYYY-MM-DD in Thailand time, regardless of the server's own OS timezone.
 * Using the server/browser's local getters (getFullYear/getMonth/getDate) would give the
 * wrong date whenever the host isn't already set to Asia/Bangkok — e.g. Vercel's serverless
 * functions run in UTC, so during 00:00-06:59 Thai time they're still on the previous UTC day.
 */
const thaiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toLocalISODate(date: Date): string {
  return thaiDateFormatter.format(date);
}

export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}

/** Shift a "YYYY-MM" string by `delta` months, using pure integer arithmetic (no Date/timezone involved). */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  const y = Math.floor(total / 12);
  const m = (((total % 12) + 12) % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** "2026-08-31" -> "31 สิงหาคม 2026" */
export function formatThaiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${THAI_MONTHS[m - 1]} ${y}`;
}

/** "2026-08" -> "สิงหาคม 2026" */
export function formatThaiMonthYear(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return `${THAI_MONTHS[m - 1]} ${y}`;
}
