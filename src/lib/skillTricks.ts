/** Basic Inline Skating curriculum — checklist items an instructor rates per student,
 *  independent of billing course_type (see migration_student_skill_tracking.sql /
 *  migration_student_skill_levels.sql). Content transcribed from the business's "Basic
 *  Inline Skating Class" reference sheet. */

export type StatAxis = "forward" | "backward" | "turning" | "breaking";

export type SkillCategory = "day1" | "forward" | "backward" | "turning" | "breaking" | "other";

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  day1: "Day 1 (พื้นฐานความปลอดภัย)",
  forward: "Forward",
  backward: "Backward",
  turning: "Turning",
  breaking: "Breaking",
  other: "Other",
};

/** Stat-wheel axis labels are literal category names, not RPG-style abbreviations. */
export const STAT_AXIS_LABEL: Record<StatAxis, string> = {
  forward: "Forward",
  backward: "Backward",
  turning: "Turning",
  breaking: "Breaking",
};

export type SkillLevel = 1 | 2 | 3;

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  1: "กำลังฝึก",
  2: "ทำได้",
  3: "ชำนาญ",
};

/** Overall % (all 18 tricks including Day 1) a student needs to pass Basic and move on to
 *  Basic Slalom. */
export const GRADUATION_THRESHOLD_PERCENT = 80;

/** Day 1 is a prerequisite safety gate per the reference sheet ("ควรครอบคลุมเนื้อหาของ Day 1
 *  ได้ครบถ้วนเนื่องจากเป็นพื้นฐานความปลอดภัยเบื้องต้น") — tracked with a level like everything
 *  else, but excluded from the stat radar (axis: null): it's the gate before scoring starts,
 *  not a discipline to score on its own. It still counts toward the overall 80% graduation
 *  threshold, per an explicit "ทุกท่าใน basic" business rule. */
export type SkillTrick = {
  key: string;
  label: string;
  category: SkillCategory;
  axis: StatAxis | null;
  description: string;
};

export const SKILL_TRICKS: SkillTrick[] = [
  // Day 1 — gate, not scored on the radar, but counts toward the overall 80%
  {
    key: "v_walk",
    label: "V-Walk",
    category: "day1",
    axis: null,
    description: "ยกเท้าเลยระดับข้อเท้า / ยกเข่าขึ้นโดยไม่ดีดเท้าไปด้านหลัง / ข้อเท้าตรงไม่แบะ",
  },
  { key: "step_turn", label: "Step Turn", category: "day1", axis: null, description: "กลับตัวซ้ายขวาได้" },
  { key: "falling", label: "Falling", category: "day1", axis: null, description: "ล้มโดยใช้สนับป้องกัน" },
  { key: "standing", label: "Standing", category: "day1", axis: null, description: "ยืนขึ้นโดยไม่มีสิ่งของรอบข้างช่วยเหลือ" },
  { key: "sitting", label: "Sitting", category: "day1", axis: null, description: "ลงไปนั่งจากตำแหน่งยืนบนล้อได้" },

  // Forward -> Forward axis
  {
    key: "scootering",
    label: "Scootering",
    category: "forward",
    axis: "forward",
    description: "จำลองถีบเท้าเสมือนไถ Scooter ถีบได้ทั้งสองขาเพื่อทรงตัวเคลื่อนไปข้างหน้า",
  },
  { key: "stride_1", label: "Stride 1", category: "forward", axis: "forward", description: "Scootering ที่ถีบสลับขาซ้าย-ขวาต่อเนื่อง" },
  { key: "stride_2", label: "Stride 2", category: "forward", axis: "forward", description: "Stride 1 โดยย่อเข่ามากขึ้น ถีบยันก้าวให้ยาวขึ้น" },
  {
    key: "swizzle",
    label: "Swizzle",
    category: "forward",
    axis: "forward",
    description: "ตั้งขาตัว V ถีบไปข้างหน้าวาดขาเป็นวงบรรจบตัว A ทำต่อเนื่องสลับกันไป",
  },
  {
    key: "one_foot_balance",
    label: "One Foot Balance",
    category: "forward",
    axis: "forward",
    description: "ทรงตัวขาเดียวจนปล่อยมือได้ ทำได้ทั้งขาซ้ายและขวา อย่างน้อย 5 เมตร",
  },

  // Backward -> Backward axis
  {
    key: "back_stride",
    label: "Back Stride",
    category: "backward",
    axis: "backward",
    description: "ตั้งขาตัว A ยกขาถีบสลับกันไปอย่างต่อเนื่องถอยหลัง",
  },
  {
    key: "back_swizzle",
    label: "Back Swizzle",
    category: "backward",
    axis: "backward",
    description: "ตั้งขาตัว A ถีบเท้าไปข้างหลังวาดขาเป็นวงบรรจบตัว v ต่อเนื่อง",
  },

  // Turning -> Turning axis
  {
    key: "a_frame_turn",
    label: "A-Frame Turn",
    category: "turning",
    axis: "turning",
    description: "ทรงขาเป็นตัว A บิดสะโพกหันไปทิศที่จะเลี้ยว น้ำหนักตัวอยู่ตรงกลาง",
  },
  {
    key: "parallel_turn",
    label: "Parallel Turn",
    category: "turning",
    axis: "turning",
    description: "ทิ้งน้ำหนักไปข้างที่จะเลี้ยว ขาที่เลี้ยวแบะออกนอก ขาตามแบะเข้าใน",
  },
  { key: "mohawk_turn", label: "Mohawk Turn", category: "turning", axis: "turning", description: "เลี้ยวแบบกลับตัว จากหลังไปหน้าหรือหน้าไปหลัง" },
  { key: "crossover_turn", label: "Crossover Turn", category: "turning", axis: "turning", description: "วิ่งไต่ระดับถีบสลับขาในทิศทางที่จะไป" },

  // Breaking -> Breaking axis
  { key: "snowplow", label: "Snowplow", category: "breaking", axis: "breaking", description: "เบรคที่รวบขาชี้เข้าหากันเป็นตัว A" },
  {
    key: "t_break",
    label: "T-Break",
    category: "breaking",
    axis: "breaking",
    description: "เบรคที่ตั้งขาเป็นตัว T โดยใช้ขาข้างหนึ่งวางหลังเท้าอีกข้างในทิศตั้งฉาก",
  },
  { key: "spin_stop", label: "Spin Stop", category: "breaking", axis: "breaking", description: "ยกขาข้างหนึ่งจิกปลายเท้าให้เกิดแรงหมุนตัวเพื่อเบรค" },

  // Other -> folded into Turning axis (closest discipline: body control/precision)
  { key: "jumping", label: "Jumping", category: "other", axis: "turning", description: "กระโดดข้ามสิ่งกีดขวาง เช่น โคน หลุมเล็กๆ รางน้ำ" },
];

export type SkillLevels = ReadonlyMap<string, SkillLevel>;

export function isDay1Complete(levels: SkillLevels): boolean {
  return SKILL_TRICKS.filter((t) => t.category === "day1").every((t) => levels.has(t.key));
}

/** % per stat axis = average(level)/3, i.e. all-level-3 = 100%. Day 1 excluded (axis: null). */
export function computeStatScores(levels: SkillLevels): Record<StatAxis, number> {
  const totals: Record<StatAxis, { sum: number; count: number }> = {
    forward: { sum: 0, count: 0 },
    backward: { sum: 0, count: 0 },
    turning: { sum: 0, count: 0 },
    breaking: { sum: 0, count: 0 },
  };
  for (const trick of SKILL_TRICKS) {
    if (!trick.axis) continue;
    totals[trick.axis].count++;
    totals[trick.axis].sum += levels.get(trick.key) ?? 0;
  }
  const scores = {} as Record<StatAxis, number>;
  for (const axis of Object.keys(totals) as StatAxis[]) {
    const { sum, count } = totals[axis];
    scores[axis] = count === 0 ? 0 : Math.round((sum / (count * 3)) * 100);
  }
  return scores;
}

/** Overall % across ALL 18 tricks (Day 1 included) — the graduation metric, distinct from
 *  the per-axis radar which excludes Day 1. */
export function overallProgress(levels: SkillLevels): number {
  if (SKILL_TRICKS.length === 0) return 0;
  const sum = SKILL_TRICKS.reduce((acc, t) => acc + (levels.get(t.key) ?? 0), 0);
  return Math.round((sum / (SKILL_TRICKS.length * 3)) * 100);
}

export function readyToGraduate(levels: SkillLevels): boolean {
  return overallProgress(levels) >= GRADUATION_THRESHOLD_PERCENT;
}
