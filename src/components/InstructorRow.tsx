"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInstructorProfile } from "@/app/admin/actions";
import type { Profile } from "@/lib/types";

export default function InstructorRow({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {profile.full_name}{" "}
            <span className="text-gray-400">
              ({profile.role === "admin" ? "แอดมิน" : "ผู้สอน"}
              {!profile.is_active && " · ปิดใช้งาน"})
            </span>
          </p>
          <p className="text-gray-500">
            ชื่อเล่นล็อกอิน: {profile.nickname || "ยังไม่ตั้ง"} · อัตรา{" "}
            {profile.rate_type === "fixed" ? `${profile.rate_value} บาท/รอบ` : `${profile.rate_value}%`}
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
                await updateInstructorProfile(profile.id, formData);
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
            <label className="block font-medium">ชื่อ-นามสกุล</label>
            <input
              name="full_name"
              defaultValue={profile.full_name}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">ชื่อเล่น (ใช้ล็อกอิน)</label>
            <input
              name="nickname"
              defaultValue={profile.nickname ?? ""}
              placeholder="เช่น เอ, บอย, พี่หนึ่ง"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
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
          <div className="space-y-1">
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
          <div className="space-y-1">
            <label className="block font-medium">รูปแบบค่าตอบแทน</label>
            <select
              name="rate_type"
              defaultValue={profile.rate_type}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="percent">เปอร์เซ็นต์ของรายรับ</option>
              <option value="fixed">คงที่ต่อรอบ</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block font-medium">อัตรา</label>
            <input
              name="rate_value"
              type="number"
              step="0.01"
              defaultValue={profile.rate_value}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">บทบาท</label>
            <select
              name="role"
              defaultValue={profile.role}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="instructor">ผู้สอน</option>
              <option value="admin">แอดมิน</option>
            </select>
          </div>
          <label className="flex items-center gap-2 self-end">
            <input type="checkbox" name="is_active" defaultChecked={profile.is_active} />
            เปิดใช้งานอยู่
          </label>

          {error && <p className="text-red-600 sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-rose-500 to-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      )}
    </div>
  );
}
