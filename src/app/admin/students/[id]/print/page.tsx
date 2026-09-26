import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/PrintButton";
import StatRadarChart from "@/components/StatRadarChart";
import {
  SKILL_TRICKS,
  SKILL_CATEGORY_LABEL,
  LEVEL_LABEL,
  computeStatScores,
  overallProgress,
  readyToGraduate,
  isDay1Complete,
  STAT_AXIS_LABEL,
  GRADUATION_THRESHOLD_PERCENT,
  type SkillCategory,
  type SkillLevel,
} from "@/lib/skillTricks";
import { formatThaiDate } from "@/lib/date";

const CATEGORY_ORDER: SkillCategory[] = ["day1", "forward", "backward", "turning", "breaking", "other"];
const LEVEL_ICON: Record<SkillLevel, string> = { 1: "🟡", 2: "🟢", 3: "✅" };

export default async function StudentProgressPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const { id } = await params;

  const [{ data: student }, { data: checks }] = await Promise.all([
    supabase.from("students").select("id, full_name").eq("id", id).single(),
    supabase.from("student_skill_checks").select("trick_key, level, notes").eq("student_id", id),
  ]);
  if (!student) notFound();

  const ratings = new Map((checks ?? []).map((c) => [c.trick_key, { level: c.level as SkillLevel, notes: c.notes as string | null }]));
  const levels = new Map([...ratings].map(([key, r]) => [key, r.level]));
  const scores = computeStatScores(levels);
  const progress = overallProgress(levels);
  const graduated = readyToGraduate(levels);
  const day1Done = isDay1Complete(levels);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-gray-500">
          ก่อนกดพิมพ์: เปิดตัวเลือก &quot;พิมพ์พื้นหลัง / Background graphics&quot; ในหน้าต่างพิมพ์ ไม่งั้นสีจะหาย
        </p>
        <PrintButton />
      </div>

      <div className="space-y-4 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6 print:p-4">
        <div className="relative flex items-center justify-center gap-4 py-2">
          <Image src="/logo.jpg" alt="T-STAR Academy" width={56} height={56} className="rounded-2xl shadow-md" />
          <div className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 shadow-md">
            <h1 className="text-xl font-bold text-white">รายงานความคืบหน้า — {student.full_name}</h1>
          </div>
        </div>
        <p className="text-center text-sm text-blue-950">ข้อมูล ณ วันที่ {formatThaiDate(today)}</p>

        {graduated && (
          <p className="text-center text-sm font-semibold text-emerald-700">
            🎓 ผ่านเกณฑ์ {GRADUATION_THRESHOLD_PERCENT}% ของ Basic Course แล้ว — พร้อมเลื่อนไปเรียน Basic Slalom
          </p>
        )}

        <div className="flex flex-col items-center justify-around gap-4 sm:flex-row">
          <StatRadarChart scores={scores} size={240} />
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {(Object.keys(scores) as (keyof typeof scores)[]).map((axis) => (
              <div key={axis}>
                <span className="font-semibold text-blue-950">{STAT_AXIS_LABEL[axis]}</span>
                <span className="ml-2 text-gray-600">{scores[axis]}%</span>
              </div>
            ))}
            <div className="col-span-2 mt-2 border-t border-gray-200 pt-2 text-base font-semibold text-orange-600">
              ความคืบหน้ารวม {progress}% / {GRADUATION_THRESHOLD_PERCENT}%
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORY_ORDER.map((category) => {
            const tricks = SKILL_TRICKS.filter((t) => t.category === category);
            const locked = category !== "day1" && !day1Done;
            return (
              <div key={category} className="rounded-xl border border-blue-950/10 bg-white/70 p-3">
                <h3 className="mb-1 text-sm font-semibold text-blue-950">{SKILL_CATEGORY_LABEL[category]}</h3>
                <ul className="space-y-1 text-sm">
                  {tricks.map((trick) => {
                    const rating = ratings.get(trick.key);
                    return (
                      <li key={trick.key}>
                        <div className="flex items-center gap-2">
                          <span>{rating ? LEVEL_ICON[rating.level] : locked ? "🔒" : "⬜"}</span>
                          <span className={rating ? "text-gray-800" : "text-gray-400"}>
                            {trick.label}
                            {rating && <span className="ml-1 text-xs text-gray-500">({LEVEL_LABEL[rating.level]})</span>}
                          </span>
                        </div>
                        {rating?.notes && <p className="ml-6 text-xs italic text-gray-500">{rating.notes}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
