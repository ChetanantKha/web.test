"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkOrphanedSessionToPackage } from "@/app/admin/actions";
import ErrorAlert from "@/components/ErrorAlert";
import { formatThaiDate } from "@/lib/date";
import { COURSE_TYPE_LABEL } from "@/lib/courseTypes";
import type { CoursePackage, Session } from "@/lib/types";

type Finding = {
  pkg: CoursePackage;
  instructorName: string;
  candidates: Session[];
};

type AuditLogRow = {
  id: string;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

function courseLabel(courseType: string) {
  return COURSE_TYPE_LABEL[courseType as keyof typeof COURSE_TYPE_LABEL] ?? courseType;
}

export default function PackageAuditList({ findings, fixHistory }: { findings: Finding[]; fixHistory: AuditLogRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [justFixed, setJustFixed] = useState<string[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  function logFix(pkg: CoursePackage, session: Session, newUsedSessions: number | undefined) {
    setLinkedIds((prev) => new Set(prev).add(session.id));
    setJustFixed((prev) => [
      `${pkg.student_name} · ${formatThaiDate(session.session_date)} ${session.start_time.slice(0, 5)} → เชื่อมเข้าคอร์ส ${courseLabel(
        pkg.course_type,
      )} (${newUsedSessions ?? "?"}/${pkg.total_sessions})`,
      ...prev,
    ]);
  }

  function fixOne(pkg: CoursePackage, session: Session) {
    setError(null);
    startTransition(async () => {
      const result = await linkOrphanedSessionToPackage(session.id, pkg.id);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      logFix(pkg, session, result && "newUsedSessions" in result ? result.newUsedSessions : undefined);
      router.refresh();
    });
  }

  function fixAll(pkg: CoursePackage, candidates: Session[]) {
    setError(null);
    startTransition(async () => {
      for (const session of candidates) {
        if (linkedIds.has(session.id)) continue;
        const result = await linkOrphanedSessionToPackage(session.id, pkg.id);
        if (result && "error" in result) {
          setError(`${pkg.student_name}: ${result.error}`);
          break;
        }
        logFix(pkg, session, result && "newUsedSessions" in result ? result.newUsedSessions : undefined);
      }
      router.refresh();
    });
  }

  const visibleFindings = findings
    .map((f) => ({ ...f, candidates: f.candidates.filter((s) => !linkedIds.has(s.id)) }))
    .filter((f) => f.candidates.length > 0);

  return (
    <div className="space-y-4">
      {error && <ErrorAlert message={error} />}

      {justFixed.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
          <p className="mb-1 font-medium text-green-800">แก้ไปแล้วรอบนี้:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-green-700">
            {justFixed.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {visibleFindings.length === 0 && (
          <p className="text-sm text-gray-500">ไม่พบคาบเรียนที่นับไม่ครบ — ข้อมูลครบถ้วนแล้ว</p>
        )}
        {visibleFindings.map(({ pkg, instructorName, candidates }) => (
          <div key={pkg.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {pkg.student_name} <span className="text-gray-500">· {instructorName}</span>
                </p>
                <p className="text-gray-600">
                  {courseLabel(pkg.course_type)} · ใช้ไป {pkg.used_sessions}/{pkg.total_sessions} ครั้ง · เจอ{" "}
                  {candidates.length} คาบที่ควรนับเพิ่ม
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() => fixAll(pkg, candidates)}
                className="active:scale-95 transition-transform duration-100 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                เชื่อมทั้งหมด ({candidates.length})
              </button>
            </div>

            <div className="mt-2 space-y-1 border-t border-amber-100 pt-2">
              {candidates.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                  <span>
                    {formatThaiDate(s.session_date)} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} ·{" "}
                    {courseLabel(s.course_type)} · {s.price.toLocaleString()} บาท
                  </span>
                  <button
                    disabled={pending}
                    onClick={() => fixOne(pkg, s)}
                    className="active:scale-95 transition-transform duration-100 whitespace-nowrap rounded border border-gray-300 px-2 py-0.5 hover:bg-white disabled:opacity-50"
                  >
                    เชื่อมคาบนี้ (+1)
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {fixHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-600">ประวัติการแก้ไขก่อนหน้า</h2>
          <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500">
            {fixHistory.map((row) => {
              const nd = row.new_data ?? {};
              const before = row.old_data?._package_used_sessions_before;
              const after = nd._package_used_sessions_after;
              return (
                <p key={row.id}>
                  {typeof nd.session_date === "string" ? formatThaiDate(nd.session_date) : "-"}{" "}
                  {typeof nd.start_time === "string" ? nd.start_time.slice(0, 5) : ""} · นักเรียน{" "}
                  {typeof nd.student_name === "string" ? nd.student_name : "-"} · นับเข้าคอร์สแล้ว ({String(before ?? "?")}{" "}
                  → {String(after ?? "?")}) · {new Date(row.changed_at).toLocaleString("th-TH")}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
