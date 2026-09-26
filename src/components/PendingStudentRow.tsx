"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findOrCreateStudent } from "@/lib/skillActions";
import ErrorAlert from "@/components/ErrorAlert";

/** A student's name pulled from an existing Basic-course booking/package that hasn't had its
 *  checklist opened yet (no `students` row exists for them). Clicking creates that row
 *  transparently (see findOrCreateStudent) and jumps straight to their checklist — no typing. */
export default function PendingStudentRow({ name, basePath }: { name: string; basePath: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await findOrCreateStudent(name);
            if (result && "error" in result) {
              setError(result.error);
              return;
            }
            if (result && "id" in result) router.push(`${basePath}/${result.id}`);
          })
        }
        className="flex w-full items-center justify-between gap-2 text-left text-sm disabled:opacity-50"
      >
        <span className="font-medium text-gray-700">{name}</span>
        <span className="text-xs text-gray-400">{pending ? "กำลังเปิด..." : "ลงคอร์ส Basic ไว้แล้ว — แตะเพื่อเริ่มเช็คลิสต์"}</span>
      </button>
      {error && (
        <div className="mt-1">
          <ErrorAlert message={error} />
        </div>
      )}
    </div>
  );
}
