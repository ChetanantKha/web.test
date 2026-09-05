"use client";

import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { formatThaiDate } from "@/lib/date";
import type { Session } from "@/lib/types";

export default function StaffSessionList({ sessions }: { sessions: Session[] }) {
  const [view, setView] = useState<"time" | "student">("time");

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500">ยังไม่มีตารางสอน</p>;
  }

  const groups = new Map<string, { label: string; items: Session[] }>();
  for (const s of sessions) {
    const label = s.student_name?.trim() || "ไม่ระบุชื่อ";
    const key = label.toLowerCase();
    const group = groups.get(key) ?? { label, items: [] };
    group.items.push(s);
    groups.set(key, group);
  }
  const studentGroups = [...groups.values()].sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setView("time")}
          className={`rounded-lg px-3 py-1.5 ${
            view === "time" ? "bg-gray-900 text-white" : "border border-gray-300"
          }`}
        >
          ดูตามเวลา
        </button>
        <button
          onClick={() => setView("student")}
          className={`rounded-lg px-3 py-1.5 ${
            view === "student" ? "bg-gray-900 text-white" : "border border-gray-300"
          }`}
        >
          ดูตามผู้เรียน
        </button>
      </div>

      {view === "time" ? (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {studentGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                {group.label} <span className="font-normal text-gray-400">({group.items.length} คาบ)</span>
              </p>
              {group.items.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session: s }: { session: Session }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {formatThaiDate(s.session_date)} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
          </p>
          <p className="text-gray-500">นักเรียน {s.student_name || "-"}</p>
          <p className="text-gray-500">ยอดที่จะได้รับ {s.instructor_payout.toLocaleString()} บาท</p>
        </div>
        <StatusBadge session={s} />
      </div>
    </div>
  );
}
