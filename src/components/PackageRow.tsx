"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePackage, updatePackage } from "@/app/admin/actions";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";
import type { CoursePackage } from "@/lib/types";

type Instructor = { id: string; full_name: string };

const STATUS_LABEL: Record<CoursePackage["status"], string> = {
  active: "กำลังใช้",
  completed: "ครบแล้ว",
  cancelled: "ยกเลิก",
};

export default function PackageRow({ pkg, instructors }: { pkg: CoursePackage; instructors: Instructor[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remaining = pkg.total_sessions - pkg.used_sessions;
  const isLow = pkg.status === "active" && remaining <= 2 && remaining > 0;
  const isFull = pkg.status === "active" && remaining <= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {pkg.student_name} <span className="text-gray-400">· {pkg.profiles?.full_name ?? "-"}</span>
          </p>
          <p className="text-gray-500">
            {COURSE_TYPE_LABEL[pkg.course_type as keyof typeof COURSE_TYPE_LABEL] ?? pkg.course_type} ·{" "}
            <span
              className={
                isFull ? "font-medium text-red-600" : isLow ? "font-medium text-orange-600" : undefined
              }
            >
              {pkg.used_sessions}/{pkg.total_sessions} ครั้ง
            </span>{" "}
            · {STATUS_LABEL[pkg.status]}
          </p>
          {pkg.notes && <p className="text-gray-400">{pkg.notes}</p>}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-gray-300 px-3 py-1.5">
          {open ? "ปิด" : "แก้ไข"}
        </button>
      </div>

      {open && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await updatePackage(pkg.id, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
              }
            });
          }}
          className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <label className="block font-medium">ชื่อผู้เรียน</label>
            <input
              name="student_name"
              defaultValue={pkg.student_name}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">ผู้สอน</label>
            <select
              name="instructor_id"
              defaultValue={pkg.instructor_id}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block font-medium">จำนวนครั้งทั้งหมด</label>
            <input
              type="number"
              name="total_sessions"
              min={1}
              defaultValue={pkg.total_sessions}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">ใช้ไปแล้ว</label>
            <input
              type="number"
              name="used_sessions"
              min={0}
              defaultValue={pkg.used_sessions}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">สถานะ</label>
            <select
              name="status"
              defaultValue={pkg.status}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="active">กำลังใช้</option>
              <option value="completed">ครบแล้ว</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block font-medium">หมายเหตุ</label>
            <input
              name="notes"
              defaultValue={pkg.notes ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-red-600 sm:col-span-2">{error}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`ยืนยันลบคอร์สของ "${pkg.student_name}"? คาบที่ผูกไว้จะไม่ถูกลบ แค่เลิกผูก`)) return;
                setError(null);
                startTransition(async () => {
                  try {
                    await deletePackage(pkg.id);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
                  }
                });
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              ลบคอร์สนี้
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
