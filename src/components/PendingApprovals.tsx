"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { adminConfirmAllTeaching, approveAllForInstructor, approvePayment } from "@/app/admin/actions";
import { formatThaiDate, todayLocalISO } from "@/lib/date";
import { getSessionStatus, statusLabel, type Session } from "@/lib/types";

type PendingItem = {
  id: string;
  session_date: string;
  start_time: string;
  student_name: string | null;
  instructor_payout: number;
  instructor_id: string;
  profiles: {
    full_name: string;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    qr_code_url: string | null;
  } | null;
};

export default function PendingApprovals() {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prevCount = useRef(0);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const today = todayLocalISO();

    const [pendingRes, todayRes] = await Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, session_date, start_time, student_name, instructor_payout, instructor_id, profiles!instructor_id(full_name, bank_name, bank_account_number, bank_account_name, qr_code_url)",
        )
        .not("finished_at", "is", null)
        .is("paid_at", null)
        .order("finished_at", { ascending: true }),
      supabase.from("sessions").select("*").eq("session_date", today),
    ]);

    const list = (pendingRes.data ?? []) as unknown as PendingItem[];
    setItems(list);
    setTodaySessions((todayRes.data ?? []) as Session[]);

    if (!firstLoad.current && list.length > prevCount.current) {
      setOpen(true);
    }
    prevCount.current = list.length;
    firstLoad.current = false;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch before the realtime subscription takes over
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("pending-approvals")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function handleApprove(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await approvePayment(id);
        await load();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  async function handleApproveAll(instructorId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await approveAllForInstructor(instructorId);
        await load();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  async function handleConfirmAllTeaching() {
    setError(null);
    if (!confirm("ยืนยันแทนผู้สอนทุกคนที่ยังไม่กดว่าสอนเสร็จแล้ว?")) return;
    startTransition(async () => {
      try {
        await adminConfirmAllTeaching();
        await load();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  const statusCounts = todaySessions.reduce(
    (acc, s) => {
      acc[getSessionStatus(s)] += 1;
      return acc;
    },
    { scheduled: 0, teaching: 0, finished: 0, paid: 0 } as Record<string, number>,
  );

  if (items.length === 0 && !open) {
    return null;
  }

  return (
    <>
      {items.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-amber-600"
        >
          รออนุมัติจ่ายเงิน
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-600">
            {items.length}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">รออนุมัติจ่ายเงิน</h2>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
                ปิด
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                {statusLabel.scheduled} {statusCounts.scheduled}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                {statusLabel.teaching} {statusCounts.teaching}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                {statusLabel.finished} {statusCounts.finished}
              </span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                {statusLabel.paid} {statusCounts.paid}
              </span>
            </div>

            {statusCounts.teaching > 0 && (
              <button
                disabled={pending}
                onClick={handleConfirmAllTeaching}
                className="mb-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                ยืนยันแทนทั้งหมด ({statusCounts.teaching} รายการที่ยังไม่กดเสร็จ)
              </button>
            )}

            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

            <div className="space-y-3">
              {items.length === 0 && (
                <p className="text-sm text-gray-500">ไม่มีรายการรออนุมัติจ่ายเงิน</p>
              )}
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-medium">
                    {item.profiles?.full_name ?? "-"} · {formatThaiDate(item.session_date)}{" "}
                    {item.start_time.slice(0, 5)}
                  </p>
                  <p className="text-gray-500">
                    นักเรียน {item.student_name || "-"} · ยอดจ่าย{" "}
                    <span className="font-medium text-gray-800">
                      {item.instructor_payout.toLocaleString()} บาท
                    </span>
                  </p>
                  <p className="mt-1 text-gray-500">
                    โอนเข้า: {item.profiles?.bank_name ?? "-"} {item.profiles?.bank_account_number ?? "-"} (
                    {item.profiles?.bank_account_name ?? "-"})
                  </p>
                  {item.profiles?.qr_code_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.profiles.qr_code_url}
                      alt="QR พร้อมเพย์"
                      className="mt-2 h-32 w-32 rounded border border-gray-200 object-contain"
                    />
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={pending}
                      onClick={() => handleApprove(item.id)}
                      className="rounded-lg bg-gradient-to-r from-rose-500 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      อนุมัติจ่ายรายการนี้
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => handleApproveAll(item.instructor_id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      อนุมัติทั้งหมดของผู้สอนคนนี้
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
