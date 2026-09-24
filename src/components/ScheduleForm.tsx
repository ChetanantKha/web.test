"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedule, createBulkSchedule, updateSchedule, deleteSchedule } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";
import {
  COURSE_TYPE_LABEL,
  FIXED_COURSE_TYPES,
  isDurationScaled,
  isFixedCourseType,
  isPackageCourseType,
  packageUnitLabel,
  type CourseType,
} from "@/lib/courseTypes";
import { durationHours } from "@/lib/slots";
import type { CoursePackage, Session } from "@/lib/types";

type Instructor = { id: string; full_name: string };

// "slalom"/"slalom_10" (Slalom/Slide) is the old combined course type, superseded by the
// more granular basic_slide/basic_slalom split — see wiki: tstar-academy-course-pricing.md.
// New bookings shouldn't be able to pick it; it only still shows up for students who
// already have a package locked into it (see hasLegacySlalomPackage below).
const NEW_COURSE_TYPE_ENTRIES = Object.entries(COURSE_TYPE_LABEL).filter(
  ([value]) => value !== "slalom" && value !== "slalom_10",
);

export default function ScheduleForm({
  date,
  instructors,
  studentNames,
  packages,
  editing,
  prefillStart,
  onDone,
}: {
  date: string;
  instructors: Instructor[];
  studentNames: string[];
  packages: CoursePackage[];
  editing: Session | null;
  prefillStart: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [courseType, setCourseType] = useState<CourseType>((editing?.course_type as CourseType) ?? "hourly");
  const [startTime, setStartTime] = useState(editing?.start_time.slice(0, 5) ?? prefillStart ?? "");
  const [endTimeValue, setEndTimeValue] = useState(editing?.end_time.slice(0, 5) ?? defaultEndTime(startTime));
  const [bulkMode, setBulkMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkCourseTypes, setBulkCourseTypes] = useState<Record<string, CourseType>>({});
  const [selectedInstructorId, setSelectedInstructorId] = useState(editing?.instructor_id ?? "");
  const [studentNameValue, setStudentNameValue] = useState(editing?.student_name ?? "");

  const matchedPackage =
    !editing && !bulkMode && isPackageCourseType(courseType) && studentNameValue.trim() && selectedInstructorId
      ? packages.find(
          (p) =>
            p.instructor_id === selectedInstructorId &&
            p.course_type === courseType &&
            p.student_name.trim().toLowerCase() === studentNameValue.trim().toLowerCase(),
        )
      : undefined;

  // Catches the "typed the right name, picked the wrong course type" mistake — this
  // student has a *different* active package than the one currently selected, so this
  // booking won't link to it (linkToPackage matches on course_type too). Warn either way,
  // even if picking something else was deliberate (e.g. an extra one-off lesson outside
  // the package) — better a redundant confirm than a silently mis-billed session.
  const mismatchedPackage =
    !editing && !bulkMode && studentNameValue.trim() && selectedInstructorId
      ? packages.find(
          (p) =>
            p.instructor_id === selectedInstructorId &&
            p.student_name.trim().toLowerCase() === studentNameValue.trim().toLowerCase() &&
            p.course_type !== courseType &&
            p.status === "active" &&
            p.used_sessions < p.total_sessions,
        )
      : undefined;

  // Only students already grandfathered into the old Slalom/Slide package keep the option
  // to book more sessions against it — everyone else sees just the current course types.
  const hasLegacySlalomPackage =
    !!selectedInstructorId &&
    !!studentNameValue.trim() &&
    packages.some(
      (p) =>
        p.instructor_id === selectedInstructorId &&
        p.course_type === "slalom_10" &&
        p.student_name.trim().toLowerCase() === studentNameValue.trim().toLowerCase(),
    );
  const isEditingLegacySlalom = editing?.course_type === "slalom" || editing?.course_type === "slalom_10";
  const courseTypeOptions =
    hasLegacySlalomPackage || isEditingLegacySlalom ? Object.entries(COURSE_TYPE_LABEL) : NEW_COURSE_TYPE_ENTRIES;

  const previewHours =
    startTime && endTimeValue ? Math.round(durationHours(startTime, endTimeValue) * 100) / 100 : 0;
  const pricePreview = (() => {
    if (bulkMode || !isFixedCourseType(courseType)) return null;
    const scaled = isDurationScaled(courseType);
    if (scaled && previewHours <= 0) return null;
    const factor = scaled ? previewHours : 1;
    const { price, payout } = FIXED_COURSE_TYPES[courseType];
    return { scaled, price: Math.round(price * factor * 100) / 100, payout: Math.round(payout * factor * 100) / 100 };
  })();

  // Default class length is 1 hour regardless of the calendar's own grid granularity
  // (settings.slot_minutes, which can be 30 — that's just how finely the day's slot
  // buttons are spaced, not how long a class should default to).
  function defaultEndTime(start: string, type: CourseType = courseType) {
    if (type === "skate_dance" || type === "skate_dance_10") return "16:30";
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + 60;
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
          if (editing) {
            const result = await updateSchedule(editing.id, formData);
            if (result?.error) {
              setError(result.error);
              return;
            }
            onDone();
          } else if (bulkMode) {
            const result = await createBulkSchedule(formData);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            formRef.current?.reset();
            setStartTime("");
            setCheckedIds(new Set());
            setBulkCourseTypes({});
            const notes: string[] = [];
            notes.push(
              result.failed.length === 0
                ? `จัดตารางสำเร็จ ${result.created} คน`
                : `สำเร็จ ${result.created} คน · ไม่สำเร็จ ${result.failed.length} คน: ` +
                    result.failed.map((f) => `${f.name} (${f.reason})`).join(", "),
            );
            if (result.outsideAvailability.length > 0) {
              notes.push(
                `นอกเวลาที่สะดวกของ: ${result.outsideAvailability.join(", ")} (รอผู้สอนยืนยันรับสอน)`,
              );
            }
            setNotice(notes.join(" · "));
          } else {
            if (mismatchedPackage) {
              const remaining = mismatchedPackage.total_sessions - mismatchedPackage.used_sessions;
              const proceed = confirm(
                `${studentNameValue.trim()} มีคอร์ส "${COURSE_TYPE_LABEL[mismatchedPackage.course_type as CourseType]}" ค้างอยู่ (เหลือ ${remaining}/${mismatchedPackage.total_sessions} ${packageUnitLabel(mismatchedPackage.course_type)}) แต่กำลังจะลงเป็น "${COURSE_TYPE_LABEL[courseType]}" แทน ใช่คนเดียวกันแต่ตั้งใจลงนอกคอร์สหรือเปล่า? กด OK เพื่อลงต่อ`,
              );
              if (!proceed) return;
            }
            let result = await createSchedule(formData);
            if (result && "needsAvailabilityConfirm" in result) {
              const proceed = confirm(
                `คอร์สนี้อยู่นอกเหนือจากตารางเวลาที่ ${result.instructorName} รับสอน จะยังลงตารางสอนอยู่มั้ย?`,
              );
              if (!proceed) return;
              formData.set("override_availability", "true");
              result = await createSchedule(formData);
            }
            if (result && "error" in result) {
              setError(result.error);
              return;
            }
            formRef.current?.reset();
            setStartTime("");
            setEndTimeValue("");
            setCourseType("hourly");
            setSelectedInstructorId("");
            setStudentNameValue("");
          }
          router.refresh();
        });
      }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{editing ? "แก้ไขตาราง" : "จัดตารางใหม่"}</h2>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="active:scale-95 transition-transform duration-100 text-sm text-gray-500 hover:underline"
          >
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
          {editing ? (
            <input
              type="time"
              name="start_time"
              required
              defaultValue={editing.start_time.slice(0, 5)}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          ) : (
            <input
              type="time"
              name="start_time"
              required
              value={startTime}
              onChange={(e) => {
                const v = e.target.value;
                setStartTime(v);
                setEndTimeValue(defaultEndTime(v));
              }}
              className={inputClass}
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">เวลาสิ้นสุด</label>
          <input
            type="time"
            name="end_time"
            required
            defaultValue={editing?.end_time.slice(0, 5) ?? defaultEndTime(startTime)}
            key={editing?.id ?? startTime}
            onChange={(e) => setEndTimeValue(e.target.value)}
            className={inputClass}
          />
        </div>

        {!bulkMode && (
          <>
            {!editing && packages.length > 0 && (
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-sm font-medium">เลือกจากคอร์สที่ซื้อไว้ (ไม่บังคับ)</label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const pkg = packages.find((p) => p.id === e.target.value);
                    if (!pkg) return;
                    setSelectedInstructorId(pkg.instructor_id);
                    setStudentNameValue(pkg.student_name);
                    setCourseType(pkg.course_type as CourseType);
                    if (pkg.course_type === "skate_dance" || pkg.course_type === "skate_dance_10") {
                      setStartTime("15:00");
                      setEndTimeValue("16:30");
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">-- เลือกคอร์ส --</option>
                  {packages
                    .filter((p) => p.status === "active" && p.used_sessions < p.total_sessions)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.student_name} — {instructors.find((i) => i.id === p.instructor_id)?.full_name ?? "-"} (
                        {p.used_sessions}/{p.total_sessions})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium">ผู้สอน</label>
              <select
                name="instructor_id"
                required
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
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
                value={studentNameValue ?? ""}
                onChange={(e) => setStudentNameValue(e.target.value)}
                className={inputClass}
                placeholder="พิมพ์ชื่อ (คั่นด้วย , ถ้ามีหลายคน)"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">ประเภทคอร์ส</label>
              <select
                name="course_type"
                value={courseType}
                onChange={(e) => {
                  const v = e.target.value as CourseType;
                  setCourseType(v);
                  if (!editing && (v === "skate_dance" || v === "skate_dance_10")) {
                    setStartTime("15:00");
                    setEndTimeValue("16:30");
                  }
                }}
                className={inputClass}
              >
                {courseTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {(courseType === "skate_dance" || courseType === "skate_dance_10") && (
                <p className="text-xs text-gray-500">คาบตายตัว เสาร์ 15:00-16:30 (90 นาที) แก้เวลาเองได้ถ้าจำเป็น</p>
              )}
            </div>

            {pricePreview && (
              <p className="text-xs text-gray-500 sm:col-span-2">
                {pricePreview.scaled ? `${previewHours} ชม. → ` : "ราคาคงที่ · "}
                ราคา {pricePreview.price.toLocaleString()} บาท · จ่ายผู้สอน {pricePreview.payout.toLocaleString()} บาท
              </p>
            )}

            {matchedPackage && (
              <p
                className={`text-xs sm:col-span-2 ${
                  matchedPackage.used_sessions >= matchedPackage.total_sessions ? "text-red-600" : "text-orange-700"
                }`}
              >
                {matchedPackage.used_sessions >= matchedPackage.total_sessions
                  ? `คอร์สนี้ใช้ครบ ${matchedPackage.total_sessions} ${packageUnitLabel(matchedPackage.course_type)}แล้ว จะไม่หักจากคอร์ส`
                  : `จะหักจากคอร์สที่ซื้อไว้ (เหลือ ${matchedPackage.total_sessions - matchedPackage.used_sessions}/${matchedPackage.total_sessions} ${packageUnitLabel(matchedPackage.course_type)})`}
              </p>
            )}

            {mismatchedPackage && (
              <p className="text-xs font-medium text-red-600 sm:col-span-2">
                ⚠️ {studentNameValue.trim()} มีคอร์ส &quot;{COURSE_TYPE_LABEL[mismatchedPackage.course_type as CourseType]}
                &quot; ค้างอยู่ (เหลือ {mismatchedPackage.total_sessions - mismatchedPackage.used_sessions}/
                {mismatchedPackage.total_sessions} {packageUnitLabel(mismatchedPackage.course_type)}) แต่กำลังลงเป็น &quot;
                {COURSE_TYPE_LABEL[courseType]}&quot; แทน — ถ้าไม่ตั้งใจ เปลี่ยนประเภทคอร์สให้ตรงกันก่อนบันทึก
              </p>
            )}

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
                        {NEW_COURSE_TYPE_ENTRIES.map(([value, label]) => (
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

      {error && <ErrorAlert message={error} />}
      {notice && <p className="text-sm text-gray-700">{notice}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || (bulkMode && checkedIds.size === 0)}
          className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
                const result = await deleteSchedule(editing.id);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                onDone();
                router.refresh();
              });
            }}
            className="active:scale-95 transition-transform duration-100 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
