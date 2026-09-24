export type CourseType =
  | "hourly"
  | "ten_session"
  | "slalom"
  | "slalom_10"
  | "nanny"
  | "nanny_10"
  | "basic_slide"
  | "basic_slide_10"
  | "basic_slalom"
  | "basic_slalom_10"
  | "skate_dance"
  | "skate_dance_10"
  | "custom";

type FixedCourseTypeInfo = {
  label: string;
  price: number;
  payout: number;
  /** Whether price/payout scale with the class's actual duration (per-hour rate x hours).
   *  false means the numbers are a flat amount regardless of how long the class runs
   *  (e.g. skate dance's fixed 90-minute group slot). Defaults to true when omitted. */
  scaled?: boolean;
};

export const FIXED_COURSE_TYPES: Record<Exclude<CourseType, "custom">, FixedCourseTypeInfo> = {
  hourly: { label: "คอร์สพื้นฐานรายชั่วโมง", price: 650, payout: 400 },
  ten_session: { label: "คอร์สพื้นฐาน 10 ครั้ง (600/คาบ)", price: 600, payout: 400 },
  slalom: { label: "Slalom/Slide", price: 800, payout: 600 },
  slalom_10: { label: "Slalom/Slide คอร์ส 10 ครั้ง (800/คาบ)", price: 800, payout: 600 },
  nanny: { label: "พี่เลี้ยงแนนนี่", price: 400, payout: 250 },
  nanny_10: { label: "พี่เลี้ยงแนนนี่ 10 ครั้ง (370/คาบ)", price: 370, payout: 250 },
  basic_slide: { label: "Basic Slide", price: 700, payout: 450 },
  basic_slide_10: { label: "Basic Slide 10 ครั้ง (700/คาบ)", price: 700, payout: 400 },
  basic_slalom: { label: "Basic Slalom", price: 800, payout: 500 },
  basic_slalom_10: { label: "Basic Slalom 10 ครั้ง (800/คาบ)", price: 800, payout: 450 },
  skate_dance: { label: "Skate Dance (เสาร์ 15:00-16:30)", price: 850, payout: 550, scaled: false },
  skate_dance_10: { label: "Skate Dance 10 ครั้ง (850/คาบ)", price: 850, payout: 550, scaled: false },
};

export const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  hourly: FIXED_COURSE_TYPES.hourly.label,
  ten_session: FIXED_COURSE_TYPES.ten_session.label,
  slalom: FIXED_COURSE_TYPES.slalom.label,
  slalom_10: FIXED_COURSE_TYPES.slalom_10.label,
  nanny: FIXED_COURSE_TYPES.nanny.label,
  nanny_10: FIXED_COURSE_TYPES.nanny_10.label,
  basic_slide: FIXED_COURSE_TYPES.basic_slide.label,
  basic_slide_10: FIXED_COURSE_TYPES.basic_slide_10.label,
  basic_slalom: FIXED_COURSE_TYPES.basic_slalom.label,
  basic_slalom_10: FIXED_COURSE_TYPES.basic_slalom_10.label,
  skate_dance: FIXED_COURSE_TYPES.skate_dance.label,
  skate_dance_10: FIXED_COURSE_TYPES.skate_dance_10.label,
  custom: "อื่นๆ (กรอกเอง)",
};

const FIXED_COURSE_TYPE_KEYS = Object.keys(FIXED_COURSE_TYPES) as Exclude<CourseType, "custom">[];

export function isFixedCourseType(courseType: string): courseType is Exclude<CourseType, "custom"> {
  return (FIXED_COURSE_TYPE_KEYS as string[]).includes(courseType);
}

/** Whether this course type's price/payout/package-hour-count should be multiplied by the
 *  class's actual duration in hours (true for everything except flat-rate types like skate
 *  dance). Accepts a plain string (not just a known CourseType) so callers holding a raw
 *  `sessions.course_type` value don't need to narrow it first; an unrecognized type falls
 *  back to `true` (scaled), matching every known type except the explicit `scaled: false`
 *  ones. */
export function isDurationScaled(courseType: string): boolean {
  return FIXED_COURSE_TYPES[courseType as Exclude<CourseType, "custom">]?.scaled !== false;
}

/** What a package's total_sessions/used_sessions numbers actually count in: "ชั่วโมง" (hours)
 *  for duration-scaled types — a 2-hour class draws one of these packages down by 2, not 1,
 *  since "10 ครั้ง" on these types means 10 hours, not 10 bookings — or "ครั้ง" (times/
 *  bookings) for fixed-duration types like skate dance, where every booking is the same
 *  length anyway so counting bookings and counting hours would only differ by a constant
 *  factor. */
export function packageUnitLabel(courseType: string): "ชั่วโมง" | "ครั้ง" {
  return isDurationScaled(courseType) ? "ชั่วโมง" : "ครั้ง";
}

/** Course types sold as a multi-session package that course_packages tracks usage for. */
export type PackageCourseType =
  | "ten_session"
  | "slalom_10"
  | "nanny_10"
  | "basic_slide_10"
  | "basic_slalom_10"
  | "skate_dance_10";

const PACKAGE_COURSE_TYPE_KEYS: PackageCourseType[] = [
  "ten_session",
  "slalom_10",
  "nanny_10",
  "basic_slide_10",
  "basic_slalom_10",
  "skate_dance_10",
];

export function isPackageCourseType(courseType: string): courseType is PackageCourseType {
  return (PACKAGE_COURSE_TYPE_KEYS as string[]).includes(courseType);
}

export const PACKAGE_COURSE_TYPE_LABEL: Record<PackageCourseType, string> = {
  ten_session: FIXED_COURSE_TYPES.ten_session.label,
  slalom_10: FIXED_COURSE_TYPES.slalom_10.label,
  nanny_10: FIXED_COURSE_TYPES.nanny_10.label,
  basic_slide_10: FIXED_COURSE_TYPES.basic_slide_10.label,
  basic_slalom_10: FIXED_COURSE_TYPES.basic_slalom_10.label,
  skate_dance_10: FIXED_COURSE_TYPES.skate_dance_10.label,
};
