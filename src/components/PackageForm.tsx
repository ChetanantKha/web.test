"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPackage } from "@/app/admin/actions";
import { PACKAGE_COURSE_TYPE_LABEL, type PackageCourseType } from "@/lib/courseTypes";

type Instructor = { id: string; full_name: string };

export default function PackageForm({
  instructors,
  studentNames,
}: {
  instructors: Instructor[];
  studentNames: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createPackage(formData);
            router.refresh();
            (document.getElementById("package-form") as HTMLFormElement | null)?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
          }
        });
      }}
      id="package-form"
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="font-semibold">เพิ่มคอร์สที่ซื้อ</h2>

      <datalist id="package-student-name-options">
        {studentNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium">ชื่อผู้เรียน</label>
          <input
            name="student_name"
            list="package-student-name-options"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">ผู้สอน</label>
          <select name="instructor_id" required defaultValue="" className={inputClass}>
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
          <label className="block text-sm font-medium">ประเภทคอร์ส</label>
          <select name="course_type" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              เลือกประเภทคอร์ส
            </option>
            {(Object.entries(PACKAGE_COURSE_TYPE_LABEL) as [PackageCourseType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">จำนวนครั้งทั้งหมด</label>
          <input type="number" name="total_sessions" min={1} required defaultValue={10} className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">ใช้ไปแล้ว (ก่อนเริ่มใช้ระบบ)</label>
          <input type="number" name="used_sessions" min={0} defaultValue={0} className={inputClass} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
          <input name="notes" className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : "เพิ่มคอร์ส"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";
