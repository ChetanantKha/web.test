import Link from "next/link";
import AddStudentForm from "@/components/AddStudentForm";
import PendingStudentRow from "@/components/PendingStudentRow";
import { computeStatScores, overallProgress, readyToGraduate, type SkillLevel } from "@/lib/skillTricks";

type StudentRow = { id: string; full_name: string };

export default function StudentListView({
  basePath,
  students,
  levelsByStudent,
  pendingNames,
}: {
  basePath: string;
  students: StudentRow[];
  levelsByStudent: Map<string, Map<string, SkillLevel>>;
  /** Names from existing Basic-course bookings/packages with no checklist opened yet. */
  pendingNames: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">นักเรียน &amp; เช็คลิสต์ท่า</h1>
        <AddStudentForm basePath={basePath} />
      </div>

      <div className="space-y-2">
        {students.map((s) => {
          const levels = levelsByStudent.get(s.id) ?? new Map<string, SkillLevel>();
          const progress = overallProgress(levels);
          const scores = computeStatScores(levels);
          const graduated = readyToGraduate(levels);
          return (
            <Link
              key={s.id}
              href={`${basePath}/${s.id}`}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-orange-300"
            >
              <span className="min-w-0 truncate font-medium">
                {s.full_name} {graduated && <span title="พร้อมเลื่อน Basic Slalom">🎓</span>}
              </span>
              {/* Full per-axis breakdown only fits comfortably from sm up — on a phone,
                  name + 4 labels + % on one line forces horizontal overflow/pinch-zoom. */}
              <span className="hidden shrink-0 items-center gap-3 text-xs text-gray-500 sm:flex">
                <span>Forward {scores.forward}</span>
                <span>Backward {scores.backward}</span>
                <span>Turning {scores.turning}</span>
                <span>Breaking {scores.breaking}</span>
                <span className="font-semibold text-orange-600">{progress}%</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-orange-600 sm:hidden">{progress}%</span>
            </Link>
          );
        })}
        {students.length === 0 && pendingNames.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีนักเรียนในระบบ</p>}
      </div>

      {pendingNames.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500">ลงคอร์ส Basic ไว้แล้ว ยังไม่เคยเปิดเช็คลิสต์</h2>
          {pendingNames.map((name) => (
            <PendingStudentRow key={name} name={name} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}
