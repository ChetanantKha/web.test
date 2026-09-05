"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedule, createBulkSchedule, updateSchedule, deleteSchedule } from "@/app/admin/actions";
import { COURSE_TYPE_LABEL, type CourseType } from "@/lib/courseTypes";
import type { Session } from "@/lib/types";

type Instructor = { id: string; full_name: string };

export default function ScheduleForm({
  date,
  instructors,
  studentNames,
  slotMinutes,
  editing,
  prefillStart,
  onDone,
}: {
  date: string;
  instructors: Instructor[];
  studentNames: string[];
  slotMinutes: number;
  editing: Session | null;
  prefillStart: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [startTime, setStartTime] = useState(editing?.start_time.slice(0, 5) ?? prefillStart ?? "");
  const [bulkMode, setBulkMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [courseType, setCourseType] = useState<CourseType>((editing?.course_type as CourseType) ?? "hourly");
  const [bulkCourseTypes, setBulkCourseTypes] = useState<Record<string, CourseType>>({});

  function defaultEndTime(start: string) {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + slotMinutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        setNotice(null);
        startTransition(async () => {
          try {
            if (editing) {
              await updateSchedule(editing.id, formData);
              onDone();
            } else if (bulkMode) {
              const result = await createBulkSchedule(formData);
              formRef.current?.reset();
              setStartTime("");
              setCheckedIds(new Set());
              setBulkCourseTypes({});
              if (result.failed.length === 0) {
                setNotice(`จัดตารางสำเร็จ ${result.created} คน`);
              } else {
                setNotice(
                  `สำเร็จ ${result.created} คน · ไม่สำเร็จ ${result.failed.length} คน: ` +
                    result.failed.map((f) => `${f.name} (${f.reason})`).join(", "),
                );
              }
            } else {
              await createSchedule(formData);
              formRef.current?.reset();
              setStartTime("");
              setCourseType("hourly");
            }
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

      {!editing && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bulkMode}
            onChange={(e) => {
              setBulkMode(e.target.checked);
              setCheckedIds(new Set());
            }}
          />
          จัดให้ผู้สอนหลายคน (คนละคลาส เวลาเดียวกัน)
        </label>
      )}

      <input type="hidden" name="session_date" value={date} />

      <datalist id="student-name-options">
        {studentNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {!bulkMode && (
          <>
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
                list="student-name-options"
                defaultValue={editing?.student_name ?? ""}
                className={inputClass}
                placeholder="พิมพ์ชื่อ (คั่นด้วย , ถ้ามีหลายคน)"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">ประเภทคอร์ส</label>
              <select
                name="course_type"
                value={courseType}
                onChange={(e) => setCourseType(e.target.value as CourseType)}
                className={inputClass}
              >
                {Object.entries(COURSE_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {courseType === "custom" && (
              <div className="space-y-1">
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
            )}
          </>
        )}
      </div>

      {bulkMode && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">เลือกผู้สอน (ติ๊กได้หลายคน)</label>
          <div className="space-y-2 rounded-lg border border-gray-200 p-2">
            {instructors.map((i) => {
              const checked = checkedIds.has(i.id);
              const rowCourseType = bulkCourseTypes[i.id] ?? "hourly";
              return (
                <div key={i.id} className="rounded-lg border border-gray-100 p-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="instructor_ids"
                      value={i.id}
                      checked={checked}
                      onChange={() => toggleChecked(i.id)}
                    />
                    {i.full_name}
                  </label>
                  {checked && (
                    <div className="mt-2 grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                      <input
                        name={`student_name__${i.id}`}
                        list="student-name-options"
                        placeholder="ชื่อผู้เรียน"
                        className={inputClass}
                      />
                      <select
                        name={`course_type__${i.id}`}
                        value={rowCourseType}
                        onChange={(e) =>
                          setBulkCourseTypes((prev) => ({ ...prev, [i.id]: e.target.value as CourseType }))
                        }
                        className={inputClass}
                      >
                        {Object.entries(COURSE_TYPE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {rowCourseType === "custom" && (
                        <input
                          type="number"
                          name={`price__${i.id}`}
                          min={0}
                          step="0.01"
                          required
                          placeholder="ราคา (บาท)"
                          className={`${inputClass} sm:col-span-2`}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {instructors.length === 0 && <p className="text-sm text-gray-500">ไม่มีผู้สอน</p>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-gray-700">{notice}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || (bulkMode && checkedIds.size === 0)}
          className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : bulkMode ? "จัดตารางทั้งหมด" : "จัดตาราง"}
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
