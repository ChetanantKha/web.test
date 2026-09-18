"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminConfirmFinished } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";

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
            const result = await adminConfirmFinished(sessionId);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
      >
        ยืนยันแทน (สอนเสร็จแล้ว)
      </button>
      {error && <ErrorAlert message={error} />}
    </div>
  );
}
