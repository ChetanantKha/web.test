export type Profile = {
  id: string;
  role: "admin" | "instructor";
  full_name: string;
  nickname: string | null;
  phone: string | null;
  rate_type: "fixed" | "percent";
  rate_value: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  qr_code_url: string | null;
  is_active: boolean;
};

export type Settings = {
  id: number;
  business_start: string;
  business_end: string;
  slot_minutes: number;
};

export type Session = {
  id: string;
  instructor_id: string;
  student_name: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  price: number;
  instructor_payout: number;
  finished_by: string | null;
  finished_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
};

export type SessionStatus = "scheduled" | "teaching" | "finished" | "paid";

export function getSessionStatus(session: Session, now: Date = new Date()): SessionStatus {
  if (session.paid_at) return "paid";
  if (session.finished_at) return "finished";

  // +07:00 makes this an absolute instant regardless of the server/browser's own timezone
  // (a bare "YYYY-MM-DDTHH:mm" string is parsed as *local* time, which is wrong on servers
  // that don't run in Thailand's timezone, e.g. Vercel's UTC serverless functions).
  const start = new Date(`${session.session_date}T${session.start_time}+07:00`);
  if (now < start) return "scheduled";
  return "teaching";
}

export const statusLabel: Record<SessionStatus, string> = {
  scheduled: "รอถึงเวลา",
  teaching: "กำลังสอนอยู่",
  finished: "รอจ่ายเงิน",
  paid: "จ่ายแล้ว",
};

export const statusColor: Record<SessionStatus, string> = {
  scheduled: "bg-gray-100 text-gray-600",
  teaching: "bg-blue-100 text-blue-700",
  finished: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};
