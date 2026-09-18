"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { substituteInstructor } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";

type Instructor = { id: string; full_name: string };

export default function SubstituteInstructorButton({
  sessionId,
  currentInstructorId,
  currentInstructorName,
  instructors,
}: {
  sessionId: string;
  currentInstructorId: string;
  currentInstructorName: string;
  instructors: Instructor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = instructors.filter((i) => i.id !== currentInstructorId);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
      >
        สอนแทน
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
      >
        <option value="">เลือกผู้สอน</option>
        {options.map((i) => (
          <option key={i.id} value={i.id}>
            {i.full_name}
          </option>
        ))}
      </select>
      <button
        disabled={pending || !selected}
        onClick={() => {
          const name = options.find((i) => i.id === selected)?.full_name ?? "";
          if (!confirm(`ยืนยันให้ "${name}" สอนแทน "${currentInstructorName}"? คาบนี้และยอดโอนเงินจะเปลี่ยนเป็นของ ${name}`))
            return;
          setError(null);
          startTransition(async () => {
            const result = await substituteInstructor(sessionId, selected);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.refresh();
          });
        }}
        className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {pending ? "..." : "ยืนยัน"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setSelected("");
          setError(null);
        }}
        className="active:scale-95 transition-transform duration-100 text-xs text-gray-500 hover:underline"
      >
        ยกเลิก
      </button>
      {error && <ErrorAlert message={error} />}
    </div>
  );
}
