"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSchedule } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";

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
            const result = await deleteSchedule(sessionId);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="active:scale-95 transition-transform duration-100 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        ยกเลิกคลาสนี้
      </button>
      {error && <ErrorAlert message={error} />}
    </div>
  );
}
