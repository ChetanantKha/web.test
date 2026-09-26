import Link from "next/link";
import StatRadarChart from "@/components/StatRadarChart";
import StudentSkillChecklist from "@/components/StudentSkillChecklist";
import {
  computeStatScores,
  overallProgress,
  readyToGraduate,
  isDay1Complete,
  STAT_AXIS_LABEL,
  GRADUATION_THRESHOLD_PERCENT,
  type SkillLevel,
} from "@/lib/skillTricks";

export default function StudentDetailView({
  student,
  ratings,
  printHref,
}: {
  student: { id: string; full_name: string; parent_phone: string | null };
  ratings: [string, { level: SkillLevel; notes: string }][];
  /** Only admin passes this — printable parent-facing report is admin-only. */
  printHref?: string;
}) {
  const levels = new Map<string, SkillLevel>(ratings.map(([key, r]) => [key, r.level]));
  const scores = computeStatScores(levels);
  const progress = overallProgress(levels);
  const graduated = readyToGraduate(levels);
  const day1Done = isDay1Complete(levels);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{student.full_name}</h1>
          {student.parent_phone && <p className="text-sm text-gray-500">ผู้ปกครอง: {student.parent_phone}</p>}
        </div>
        {printHref && (
          <Link href={printHref} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            พิมพ์รายงานให้ผู้ปกครอง →
          </Link>
        )}
      </div>

      {graduated && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          🎓 ผ่านเกณฑ์ {GRADUATION_THRESHOLD_PERCENT}% ของ Basic Course แล้ว — พร้อมเลื่อนไปเรียน Basic Slalom
        </div>
      )}

      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:justify-around">
        <StatRadarChart scores={scores} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {(Object.keys(scores) as (keyof typeof scores)[]).map((axis) => (
            <div key={axis}>
              <span className="font-semibold text-blue-950">{STAT_AXIS_LABEL[axis]}</span>
              <span className="ml-2 text-gray-600">{scores[axis]}%</span>
            </div>
          ))}
          <div className="col-span-2 mt-2 border-t border-gray-100 pt-2 font-semibold text-orange-600">
            ความคืบหน้ารวม (รวม Day 1) {progress}% / {GRADUATION_THRESHOLD_PERCENT}%
          </div>
          {!day1Done && <div className="col-span-2 text-xs text-amber-600">ยังไม่ผ่าน Day 1 — ท่าในหมวดอื่นจะถูกล็อกไว้ก่อน</div>}
        </div>
      </div>

      <StudentSkillChecklist studentId={student.id} initialRatings={ratings} />
    </div>
  );
}
