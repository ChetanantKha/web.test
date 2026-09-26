"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStudent } from "@/lib/skillActions";
import ErrorAlert from "@/components/ErrorAlert";

export default function AddStudentForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-2 text-sm font-medium text-white"
      >
        + เพิ่มนักเรียน
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createStudent(formData);
          if (result && "error" in result) {
            setError(result.error);
            return;
          }
          setOpen(false);
          if (result && "id" in result) router.push(`${basePath}/${result.id}`);
        });
      }}
      className="space-y-2 rounded-xl border border-gray-200 bg-white p-3"
    >
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap gap-2">
        <input name="full_name" placeholder="ชื่อนักเรียน" required className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input name="parent_phone" placeholder="เบอร์ผู้ปกครอง (ถ้ามี)" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
