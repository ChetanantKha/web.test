"use client";

import { useMemo, useRef, useState } from "react";
import ScheduleForm from "@/components/ScheduleForm";
import StatusBadge from "@/components/StatusBadge";
import type { Session } from "@/lib/types";

type Instructor = { id: string; full_name: string };

export default function DayView({
  date,
  slotTimes,
  slotMinutes,
  sessions,
  instructors,
  studentNames,
}: {
  date: string;
  slotTimes: string[];
  slotMinutes: number;
  sessions: Session[];
  instructors: Instructor[];
  studentNames: string[];
}) {
  const [editing, setEditing] = useState<Session | null>(null);
  const [prefillStart, setPrefillStart] = useState<string | null>(null);
  const formAnchor = useRef<HTMLDivElement>(null);

  const slotIsBooked = useMemo(() => {
    return (slot: string) =>
      sessions.find((s) => slot >= s.start_time.slice(0, 5) && slot < s.end_time.slice(0, 5));
  }, [sessions]);

  function scrollToForm() {
    formAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-600">ช่องเวลา (คลิกช่องว่างเพื่อจัดตาราง)</h2>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
          {slotTimes.map((slot) => {
            const booked = slotIsBooked(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  if (booked) {
                    setEditing(booked);
                  } else {
                    setEditing(null);
                    setPrefillStart(slot);
                  }
                  scrollToForm();
                }}
                className={`rounded-lg border p-2 text-left text-xs ${
                  booked
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{slot}</div>
                <div className="truncate">{booked ? booked.profiles?.full_name ?? "ไม่ว่าง" : "ว่าง"}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={formAnchor}>
        <ScheduleForm
          key={editing?.id ?? prefillStart ?? "new"}
          date={date}
          instructors={instructors}
          studentNames={studentNames}
          slotMinutes={slotMinutes}
          editing={editing}
          prefillStart={prefillStart}
          onDone={() => {
            setEditing(null);
            setPrefillStart(null);
          }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-600">ตารางวันนี้ทั้งหมด</h2>
        {sessions.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีตาราง</p>}
        {sessions
          .slice()
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} · {s.profiles?.full_name ?? "-"}
                </p>
                <p className="text-gray-500">
                  นักเรียน {s.student_name || "-"} · ราคา {s.price.toLocaleString()} บาท · จ่ายผู้สอน{" "}
                  {s.instructor_payout.toLocaleString()} บาท
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge session={s} />
                <button
                  onClick={() => {
                    setEditing(s);
                    scrollToForm();
                  }}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  แก้ไข
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
