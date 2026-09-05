"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmFinished } from "@/app/staff/actions";
import { formatThaiDate } from "@/lib/date";

type DueSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  student_name: string | null;
};

export default function FinishPrompt({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const [due, setDue] = useState<DueSession | null>(null);
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const check = useCallback(async () => {
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, start_time, end_time, student_name")
      .eq("instructor_id", instructorId)
      .is("finished_at", null)
      .order("session_date", { ascending: true })
      .order("end_time", { ascending: true })
      .limit(20);

    const overdue = ((data ?? []) as unknown as DueSession[]).find((s) => {
      const end = new Date(`${s.session_date}T${s.end_time}+07:00`);
      return end.toISOString() <= nowIso;
    });

    setDue(overdue ?? null);
  }, [instructorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial check before the polling interval takes over
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [check]);

  if (!due) return null;

  const isSnoozed = snoozed.has(due.id);

  if (isSnoozed) {
    return (
      <button
        onClick={() => setSnoozed((prev) => { const next = new Set(prev); next.delete(due.id); return next; })}
        title="มีคลาสรอยืนยันว่าสอนเสร็จแล้ว กดเพื่อยืนยัน"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600"
      >
        !
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-xl">
        <h2 className="font-semibold">ยืนยันการสอน</h2>
        <p className="text-sm text-gray-600">
          คุณสอนวันที่ {formatThaiDate(due.session_date)} เวลา {due.start_time.slice(0, 5)}-
          {due.end_time.slice(0, 5)}{" "}
          {due.student_name ? `(${due.student_name}) ` : ""}เสร็จแล้วหรือยัง?
        </p>
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await confirmFinished(due.id);
                setDue(null);
                router.refresh();
              })
            }
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            เสร็จแล้ว
          </button>
          <button
            onClick={() => setSnoozed((prev) => new Set(prev).add(due.id))}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            ยังไม่เสร็จ / เตือนภายหลัง
          </button>
        </div>
      </div>
    </div>
  );
}
