"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInstructorProfile, updateInstructorAvailability } from "@/app/admin/actions";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import ErrorAlert from "@/components/ErrorAlert";
import type { AvailabilityDay } from "@/lib/availability";
import type { Profile } from "@/lib/types";

export default function InstructorRow({ profile, availability }: { profile: Profile; availability: AvailabilityDay[] }) {
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
            ชื่อเล่นล็อกอิน: {profile.nicknames.length > 0 ? profile.nicknames.join(", ") : "ยังไม่ตั้ง"} · อัตรา{" "}
            {profile.rate_type === "fixed" ? `${profile.rate_value} บาท/รอบ` : `${profile.rate_value}%`}
          </p>
          <p className={profile.notify_email ? "text-gray-500" : "text-amber-600"}>
            อีเมลแจ้งเตือน: {profile.notify_email ?? "ยังไม่ตั้ง — จะไม่ได้รับอีเมลยืนยันการสอน"}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="active:scale-95 transition-transform duration-100 rounded-lg border border-gray-300 px-3 py-1.5"
        >
          {open ? "ปิด" : "แก้ไข"}
        </button>
      </div>

      {open && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await updateInstructorProfile(profile.id, formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
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
            <label className="block font-medium">ชื่อเล่น (ใช้ล็อกอิน ใส่ได้หลายชื่อ คั่นด้วยจุลภาค)</label>
            <input
              name="nicknames"
              defaultValue={profile.nicknames.join(", ")}
              placeholder="เช่น พีนัท, peanut, พี่นัท"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-medium">อีเมลสำหรับแจ้งเตือน (ยืนยันการสอนเสร็จ)</label>
            <input
              name="notify_email"
              type="email"
              defaultValue={profile.notify_email ?? ""}
              placeholder="เช่น instructor@example.com"
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

          {error && (
            <div className="sm:col-span-2">
              <ErrorAlert message={error} />
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 font-medium text-white disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      )}

      {open && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="mb-2 font-medium">เวลาที่รับสอน</h3>
          <AvailabilityEditor
            rows={availability}
            saveAction={updateInstructorAvailability.bind(null, profile.id)}
          />
        </div>
      )}
    </div>
  );
}
