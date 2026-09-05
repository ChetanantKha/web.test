"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await updateSettings(formData);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
          }
        });
      }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="font-semibold">ช่วงเวลาทำการ / ความยาวช่องเวลา</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium">เปิดทำการ</label>
          <input
            type="time"
            name="business_start"
            defaultValue={settings.business_start.slice(0, 5)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">ปิดทำการ</label>
          <input
            type="time"
            name="business_end"
            defaultValue={settings.business_end.slice(0, 5)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">ความยาวช่อง (นาที)</label>
          <input
            type="number"
            name="slot_minutes"
            min={15}
            step={15}
            defaultValue={settings.slot_minutes}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">บันทึกแล้ว</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
