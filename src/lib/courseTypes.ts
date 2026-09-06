export type CourseType = "hourly" | "ten_session" | "slalom" | "slalom_10" | "custom";

export const FIXED_COURSE_TYPES: Record<Exclude<CourseType, "custom">, {
  label: string;
  price: number;
  payout: number;
}> = {
  hourly: { label: "รายชั่วโมง", price: 500, payout: 400 },
  ten_session: { label: "คอร์ส 10 ครั้ง (470/คาบ)", price: 470, payout: 400 },
  slalom: { label: "Slalom/Slide", price: 800, payout: 650 },
  slalom_10: { label: "Slalom/Slide คอร์ส 10 ครั้ง (800/คาบ)", price: 800, payout: 600 },
};

export const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  hourly: FIXED_COURSE_TYPES.hourly.label,
  ten_session: FIXED_COURSE_TYPES.ten_session.label,
  slalom: FIXED_COURSE_TYPES.slalom.label,
  slalom_10: FIXED_COURSE_TYPES.slalom_10.label,
  custom: "อื่นๆ (กรอกเอง)",
};

export function isFixedCourseType(courseType: string): courseType is Exclude<CourseType, "custom"> {
  return courseType === "hourly" || courseType === "ten_session" || courseType === "slalom" || courseType === "slalom_10";
}
