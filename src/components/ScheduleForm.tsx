"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedule, updateSchedule, deleteSchedule } from "@/app/admin/actions";
import type { Session } from "@/lib/types";

type Instructor = { id: string; full_name: string };

export default function ScheduleForm({
  date,
  instructors,
  slotMinutes,
  editing,
  prefillStart,
  onDone,
}: {
  date: string;
  instructors: Instructor[];
  slotMinutes: number;
  editing: Session | null;
  prefillStart: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [startTime, setStartTime] = useState(editing?.start_time.slice(0, 5) ?? prefillStart ?? "");

  function defaultEndTime(start: string) {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + slotMinutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            if (editing) {
              await updateSchedule(editing.id, formData);
            } else {
              await createSchedule(formData);
              formRef.current?.reset();
              setStartTime("");
            }
            onDone();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
          }
        });
      }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{editing ? "แก้ไขตาราง" : "จัดตารางใหม่"}</h2>
        {editing && (
          <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:underline">
            ยกเลิกการแก้ไข
          </button>
        )}
      </div>

      <input type="hidden" name="session_date" value={date} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium">ผู้สอน</label>
          <select
            name="instructor_id"
            required
            defaultValue={editing?.instructor_id ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              เลือกผู้สอน
            </option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">ชื่อผู้เรียน</label>
          <input
            name="student_name"
            defaultValue={editing?.student_name ?? ""}
            className={inputClass}
            placeholder="พิมพ์ชื่อ (คั่นด้วย , ถ้ามีหลายคน)"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">เวลาเริ่ม</label>
          <input
            type="time"
            name="start_time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">เวลาสิ้นสุด</label>
          <input
            type="time"
            name="end_time"
            required
            defaultValue={editing?.end_time.slice(0, 5) ?? defaultEndTime(startTime)}
            key={editing?.id ?? startTime}
            className={inputClass}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium">ราคาที่ลูกค้าจ่าย (บาท)</label>
          <input
            type="number"
            name="price"
            min={0}
            step="0.01"
            required
            defaultValue={editing?.price ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-rose-500 to-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "จัดตาราง"}
        </button>
        {editing && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("ยืนยันยกเลิกคลาสนี้?")) return;
              setError(null);
              startTransition(async () => {
                try {
                  await deleteSchedule(editing.id);
                  onDone();
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
                }
              });
            }}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            ยกเลิกคลาสนี้
          </button>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";
