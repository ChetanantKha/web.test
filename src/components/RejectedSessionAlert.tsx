"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteSchedule, substituteInstructor } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";
import { formatThaiDate } from "@/lib/date";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";

type RejectedItem = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  course_type: string;
  student_name: string | null;
  instructor_id: string;
  profiles: { full_name: string } | null;
};

type Instructor = { id: string; full_name: string };

export default function RejectedSessionAlert({ instructors }: { instructors: Instructor[] }) {
  const router = useRouter();
  const [items, setItems] = useState<RejectedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prevCount = useRef(0);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select(
        "id, session_date, start_time, end_time, course_type, student_name, instructor_id, profiles!instructor_id(full_name)",
      )
      .not("instructor_rejected_at", "is", null)
      .order("instructor_rejected_at", { ascending: true });
    const list = (data ?? []) as unknown as RejectedItem[];
    setItems(list);
    if (!firstLoad.current && list.length > prevCount.current) setOpen(true);
    prevCount.current = list.length;
    firstLoad.current = false;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch before the realtime subscription takes over
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("rejected-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  function handleDelete(id: string) {
    if (!confirm("ลบคลาสนี้ทิ้ง? ถ้าเชื่อมกับคอร์สที่ซื้อไว้ จำนวนครั้งจะคืนกลับให้อัตโนมัติ")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSchedule(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await load();
      router.refresh();
    });
  }

  function handleSubstitute(id: string) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await substituteInstructor(id, selected);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPickingFor(null);
      setSelected("");
      await load();
      router.refresh();
    });
  }

  if (items.length === 0 && !open) return null;

  return (
    <>
      {items.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="active:scale-95 transition-transform duration-100 fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-red-600"
        >
          ผู้สอนปฏิเสธคาบนอกเวลา
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600">
            {items.length}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">ผู้สอนปฏิเสธคาบนอกเวลาที่สะดวก</h2>
              <button
                onClick={() => setOpen(false)}
                className="active:scale-95 transition-transform duration-100 text-sm text-gray-500 hover:underline"
              >
                ปิด
              </button>
            </div>

            {error && (
              <div className="mb-2">
                <ErrorAlert message={error} />
              </div>
            )}

            <div className="space-y-3">
              {items.length === 0 && <p className="text-sm text-gray-500">ไม่มีรายการ</p>}
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-300 p-3 text-sm">
                  <p className="font-medium">{item.profiles?.full_name ?? "-"} ปฏิเสธคาบนี้</p>
                  <p className="text-gray-500">
                    {formatThaiDate(item.session_date)} {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)} ·{" "}
                    {COURSE_TYPE_LABEL[item.course_type as keyof typeof COURSE_TYPE_LABEL] ?? item.course_type}
                    {item.student_name ? ` · ${item.student_name}` : ""}
                  </p>

                  {pickingFor === item.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                      >
                        <option value="">เลือกผู้สอนแทน</option>
                        {instructors
                          .filter((i) => i.id !== item.instructor_id)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.full_name}
                            </option>
                          ))}
                      </select>
                      <button
                        disabled={pending || !selected}
                        onClick={() => handleSubstitute(item.id)}
                        className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        ยืนยัน
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPickingFor(null);
                          setSelected("");
                        }}
                        className="active:scale-95 transition-transform duration-100 text-xs text-gray-500 hover:underline"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={pending}
                        onClick={() => setPickingFor(item.id)}
                        className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        หาผู้สอนแทน
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => handleDelete(item.id)}
                        className="active:scale-95 transition-transform duration-100 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        ลบคาบนี้
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
