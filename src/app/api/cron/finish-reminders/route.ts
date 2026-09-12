import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { signFinishToken } from "@/lib/confirmToken";
import { sendFinishReminderEmail } from "@/lib/email";
import { COURSE_TYPE_LABEL, type CourseType } from "@/lib/courseTypes";
import { formatThaiDate } from "@/lib/date";

/**
 * Pinged by an external scheduler (Vercel Hobby's own cron only runs once a day, too
 * slow for "right after class ends") every few minutes. Finds sessions whose end time
 * has passed, aren't marked finished yet, and haven't already gotten a reminder email,
 * then sends one with a no-login confirm link.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: candidates, error } = await supabase
    .from("sessions")
    .select("id, instructor_id, student_name, session_date, start_time, end_time, course_type, price, instructor_payout, profiles!instructor_id(full_name, notify_email)")
    .is("finished_at", null)
    .is("finish_email_sent_at", null)
    .order("session_date", { ascending: true })
    .order("end_time", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (candidates ?? []).filter((s) => {
    const end = new Date(`${s.session_date}T${s.end_time}+07:00`);
    return end.toISOString() <= nowIso;
  });

  const baseUrl = request.nextUrl.origin;
  let sent = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const s of due) {
    const instructor = s.profiles as unknown as { full_name: string; notify_email: string | null } | null;
    if (!instructor?.notify_email) {
      skipped.push(s.id);
      continue;
    }

    try {
      const token = signFinishToken(s.id);
      await sendFinishReminderEmail({
        to: instructor.notify_email,
        instructorName: instructor.full_name,
        studentName: s.student_name,
        sessionDateThai: formatThaiDate(s.session_date),
        startTime: s.start_time,
        endTime: s.end_time,
        courseTypeLabel: COURSE_TYPE_LABEL[s.course_type as CourseType] ?? s.course_type,
        price: s.price,
        payout: s.instructor_payout,
        confirmUrl: `${baseUrl}/confirm-finished/${s.id}?token=${token}`,
      });

      await supabase.from("sessions").update({ finish_email_sent_at: new Date().toISOString() }).eq("id", s.id);
      sent += 1;
    } catch (e) {
      errors.push(`${s.id}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ checked: due.length, sent, skippedNoEmail: skipped.length, errors });
}
