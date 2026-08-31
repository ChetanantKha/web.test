"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSchedule } from "@/app/admin/actions";

export default function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          if (!confirm("ยืนยันยกเลิก/ลบตารางสอนนี้? แก้คืนไม่ได้")) return;
          startTransition(async () => {
            try {
              await deleteSchedule(sessionId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
            }
          });
        }}
        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        ยกเลิกคลาสนี้
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
