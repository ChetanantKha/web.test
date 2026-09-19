"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { respondToOutsideAvailability } from "@/app/staff/actions";
import { formatThaiDate } from "@/lib/date";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";
import ErrorAlert from "@/components/ErrorAlert";

type PendingConflict = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  course_type: string;
  student_name: string | null;
};

export default function AvailabilityConflictPrompt({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<PendingConflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, start_time, end_time, course_type, student_name")
      .eq("instructor_id", instructorId)
      .eq("outside_availability", true)
      .is("instructor_confirmed_at", null)
      .is("instructor_rejected_at", null)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });
    setItems((data ?? []) as PendingConflict[]);
  }, [instructorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch before the realtime subscription takes over
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`availability-conflicts-${instructorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `instructor_id=eq.${instructorId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, instructorId]);

  if (items.length === 0) return null;
  const current = items[0];

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToOutsideAvailability(current.id, accept);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await load();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-xl">
        <h2 className="font-semibold">คลาสนี้อยู่นอกเวลาที่คุณสะดวก</h2>
        <p className="text-sm text-gray-600">
          แอดมินจัดตารางให้คุณสอนวันที่ {formatThaiDate(current.session_date)} เวลา{" "}
          {current.start_time.slice(0, 5)}-{current.end_time.slice(0, 5)} (
          {COURSE_TYPE_LABEL[current.course_type as keyof typeof COURSE_TYPE_LABEL] ?? current.course_type}
          {current.student_name ? ` · ${current.student_name}` : ""}) ซึ่งอยู่นอกเวลาที่คุณตั้งไว้ว่าสะดวกสอน
          คุณรับสอนคาบนี้ไหม?
        </p>
        {items.length > 1 && <p className="text-xs text-gray-400">และมีอีก {items.length - 1} คาบที่รอตอบ</p>}
        {error && <ErrorAlert message={error} />}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => respond(true)}
            className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            รับสอน
          </button>
          <button
            disabled={pending}
            onClick={() => respond(false)}
            className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            ไม่รับสอน
          </button>
        </div>
      </div>
    </div>
  );
}
