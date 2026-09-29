"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAllSessionsForDate } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";

/** For whole-rink closures (flooding, etc.) — cancels every class booked on this date across
 *  every instructor in one go, instead of deleting each session by hand. */
export default function CancelAllSessionsButton({ date, sessionCount }: { date: string; sessionCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sessionCount === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        ยกเลิกคลาสทั้งหมดวันนี้
      </button>
    );
  }

  function confirmCancel() {
    if (!window.confirm(`ยืนยันยกเลิกคลาสทั้งหมด ${sessionCount} คลาสในวันนี้? การกระทำนี้ย้อนกลับไม่ได้`)) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelAllSessionsForDate(date, reason.trim() || null);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-700">ยกเลิกคลาสทั้งหมด {sessionCount} คลาสในวันนี้</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล (ถ้ามี เช่น น้ำท่วม ลานปิด)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <ErrorAlert message={error} />}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={confirmCancel}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิกทั้งหมด"}
        </button>
        <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          ไม่ยกเลิก
        </button>
      </div>
    </div>
  );
}
