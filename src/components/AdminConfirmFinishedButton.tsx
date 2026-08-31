"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminConfirmFinished } from "@/app/admin/actions";

export default function AdminConfirmFinishedButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          if (!confirm("ยืนยันแทนผู้สอนว่าสอนเสร็จแล้ว? รายการจะไปรออนุมัติจ่ายเงินทันที")) return;
          startTransition(async () => {
            try {
              await adminConfirmFinished(sessionId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
            }
          });
        }}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
      >
        ยืนยันแทน (สอนเสร็จแล้ว)
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
