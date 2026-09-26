import { computePayout } from "@/lib/payout";
import { FIXED_COURSE_TYPES, isDurationScaled, isFixedCourseType } from "@/lib/courseTypes";

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Fixed course types store a per-hour rate, scaled by the class's actual duration (so
 *  extending/shortening a class in the schedule form recalculates price/payout) — except
 *  types marked non-scaled (e.g. skate dance's fixed 90-minute slot), which always charge
 *  the flat amount regardless of duration. Always pays the same rate regardless of
 *  instructor. "custom" falls back to that instructor's own rate_type/rate_value and is
 *  entered as a flat total, not scaled by duration. */
export function resolvePricing(
  courseType: string,
  customPrice: number,
  rateType: "fixed" | "percent",
  rateValue: number,
  hours: number,
) {
  if (isFixedCourseType(courseType)) {
    const { price, payout } = FIXED_COURSE_TYPES[courseType];
    const factor = isDurationScaled(courseType) ? hours : 1;
    return { price: roundMoney(price * factor), instructor_payout: roundMoney(payout * factor) };
  }
  return { price: customPrice, instructor_payout: computePayout(rateType, rateValue, customPrice) };
}

/** A package's locked legacy price/payout ("ราคาที่ล็อกไว้") is a per-hour rate, same as the
 *  current rate table — scaled by the same isDurationScaled rule (flat course types like skate
 *  dance still ignore actual duration), so a legacy-priced 2-hour class charges 2x the locked
 *  rate instead of the flat locked number regardless of length. */
export function resolveLegacyPricing(courseType: string, legacyPrice: number, legacyPayout: number, hours: number) {
  const factor = isDurationScaled(courseType) ? hours : 1;
  return { price: roundMoney(legacyPrice * factor), instructor_payout: roundMoney(legacyPayout * factor) };
}
