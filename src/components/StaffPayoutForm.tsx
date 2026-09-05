"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnPayoutInfo } from "@/app/staff/actions";
import type { Profile } from "@/lib/types";

export default function StaffPayoutForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">ข้อมูลรับเงิน</p>
          <p className="text-gray-500">
            {profile.bank_name ?? "ยังไม่ตั้งบัญชี"} {profile.bank_account_number ?? ""}
          </p>
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
                await updateOwnPayoutInfo(formData);
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
            <label className="block font-medium">เบอร์โทร</label>
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">ธนาคาร</label>
            <input
              name="bank_name"
              defaultValue={profile.bank_name ?? ""}
              placeholder="เช่น กสิกรไทย"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">เลขบัญชี</label>
            <input
              name="bank_account_number"
              defaultValue={profile.bank_account_number ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">ชื่อบัญชี</label>
            <input
              name="bank_account_name"
              defaultValue={profile.bank_account_name ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="block font-medium">รูป QR พร้อมเพย์ (ถ้ามี)</label>
            {profile.qr_code_url && (
              <input type="hidden" name="existing_qr_code_url" value={profile.qr_code_url} />
            )}
            {profile.qr_code_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.qr_code_url}
                alt="QR พร้อมเพย์"
                className="mb-1 h-20 w-20 rounded border border-gray-200 object-contain"
              />
            )}
            <input type="file" name="qr_code" accept="image/*" className="w-full text-sm" />
          </div>

          {error && <p className="text-red-600 sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 font-medium text-white disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      )}
    </div>
  );
}
