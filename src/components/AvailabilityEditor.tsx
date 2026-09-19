"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ErrorAlert from "@/components/ErrorAlert";
import { WEEKDAY_LABELS, type AvailabilityDay } from "@/lib/availability";

type SaveAction = (formData: FormData) => Promise<{ error: string } | void>;
type Window = { start: string; end: string };

function initialState(rows: AvailabilityDay[]) {
  const closed: Record<number, boolean> = {};
  const windows: Record<number, Window[]> = {};
  for (let day = 0; day < 7; day++) windows[day] = [];
  for (const r of rows) {
    if (r.is_closed) {
      closed[r.day_of_week] = true;
    } else {
      windows[r.day_of_week].push({ start: r.start_time?.slice(0, 5) ?? "", end: r.end_time?.slice(0, 5) ?? "" });
    }
  }
  return { closed, windows };
}

export default function AvailabilityEditor({ rows, saveAction }: { rows: AvailabilityDay[]; saveAction: SaveAction }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [init] = useState(() => initialState(rows));
  const [closedByDay, setClosedByDay] = useState<Record<number, boolean>>(init.closed);
  const [windowsByDay, setWindowsByDay] = useState<Record<number, Window[]>>(init.windows);

  function addWindow(day: number) {
    setWindowsByDay((prev) => ({ ...prev, [day]: [...prev[day], { start: "", end: "" }] }));
  }
  function removeWindow(day: number, index: number) {
    setWindowsByDay((prev) => ({ ...prev, [day]: prev[day].filter((_, i) => i !== index) }));
  }
  function updateWindow(day: number, index: number, field: "start" | "end", value: string) {
    setWindowsByDay((prev) => ({
      ...prev,
      [day]: prev[day].map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    }));
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await saveAction(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <p className="text-xs text-gray-500">
        วันที่ไม่ได้ตั้งค่าไว้ถือว่าเปิดรับสอนได้ทั้งวัน — ติ๊ก &quot;ปิดรับสอน&quot; เพื่อปิดทั้งวัน หรือเพิ่มช่วงเวลาที่รับสอนได้
        (เพิ่มได้หลายช่วงต่อวัน เช่น 10:00-11:00 และ 14:00-15:00)
      </p>
      <div className="space-y-1.5">
        {WEEKDAY_LABELS.map((label, day) => {
          const closed = closedByDay[day] ?? false;
          const windows = windowsByDay[day] ?? [];
          return (
            <div key={day} className="rounded-lg border border-gray-200 p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 font-medium">{label}</span>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    name={`closed_${day}`}
                    checked={closed}
                    onChange={(e) => setClosedByDay((prev) => ({ ...prev, [day]: e.target.checked }))}
                  />
                  ปิดรับสอน
                </label>
                {!closed && (
                  <button
                    type="button"
                    onClick={() => addWindow(day)}
                    className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
                  >
                    + เพิ่มช่วงเวลา
                  </button>
                )}
              </div>

              {!closed && windows.length > 0 && <input type="hidden" name={`window_count_${day}`} value={windows.length} />}

              {!closed &&
                windows.map((w, idx) => (
                  <div key={idx} className="mt-1.5 flex items-center gap-2 pl-[4.5rem]">
                    <input
                      type="time"
                      name={`start_${day}_${idx}`}
                      value={w.start}
                      onChange={(e) => updateWindow(day, idx, "start", e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                    />
                    <span className="text-gray-400">ถึง</span>
                    <input
                      type="time"
                      name={`end_${day}_${idx}`}
                      value={w.end}
                      onChange={(e) => updateWindow(day, idx, "end", e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeWindow(day, idx)}
                      className="active:scale-95 transition-transform duration-100 text-xs text-red-500 hover:underline"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {error && <ErrorAlert message={error} />}
      {saved && !error && <p className="text-xs text-green-700">บันทึกแล้ว</p>}

      <button
        type="submit"
        disabled={pending}
        className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกเวลาที่รับสอน"}
      </button>
    </form>
  );
}
