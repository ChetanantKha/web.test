"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computePayout } from "@/lib/payout";
import { durationHours } from "@/lib/slots";
import { isFixedCourseType, isPackageCourseType } from "@/lib/courseTypes";
import { dayOfWeekOf, isWithinAvailability, saveAvailability } from "@/lib/availability";
import { resolvePricing } from "@/lib/pricing";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("ต้องเป็นแอดมินเท่านั้น");

  return { supabase, adminId: user.id };
}

/** Server Action errors that reach the client via `throw` have their message redacted
 *  to a generic placeholder in production builds of this Next.js version — every exported
 *  action below must catch its own errors and return { error } instead. This helper wraps
 *  a function's body so internal code can still just `throw new Error("ข้อความไทย")` as
 *  usual; only the outermost exported function needs the try/catch. */
async function asResult<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

// ============================================================
// instructor profiles
// ============================================================
export async function updateInstructorProfile(instructorId: string, formData: FormData) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();

    let qrCodeUrl = String(formData.get("existing_qr_code_url") || "") || null;
    const qrFile = formData.get("qr_code");
    if (qrFile instanceof File && qrFile.size > 0) {
      const ext = qrFile.name.split(".").pop() || "jpg";
      const path = `${instructorId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payout-qr").upload(path, qrFile);
      if (uploadError) throw new Error(`อัปโหลด QR ไม่สำเร็จ: ${uploadError.message}`);
      qrCodeUrl = supabase.storage.from("payout-qr").getPublicUrl(path).data.publicUrl;
    }

    const nicknames = String(formData.get("nicknames") || "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: String(formData.get("full_name") || ""),
        nicknames,
        notify_email: String(formData.get("notify_email") || "").trim() || null,
        phone: String(formData.get("phone") || "") || null,
        rate_type: String(formData.get("rate_type") || "percent"),
        rate_value: Number(formData.get("rate_value") || 0),
        bank_name: String(formData.get("bank_name") || "") || null,
        bank_account_number: String(formData.get("bank_account_number") || "") || null,
        bank_account_name: String(formData.get("bank_account_name") || "") || null,
        qr_code_url: qrCodeUrl,
        is_active: formData.get("is_active") === "on",
        role: String(formData.get("role") || "instructor"),
      })
      .eq("id", instructorId);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/instructors");
  });
}

// ============================================================
// calendar settings
// ============================================================
export async function updateSettings(formData: FormData) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("settings")
      .update({
        business_start: String(formData.get("business_start") || "06:00"),
        business_end: String(formData.get("business_end") || "21:00"),
        slot_minutes: Number(formData.get("slot_minutes") || 60),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/settings");
  });
}

// ============================================================
// scheduling
// ============================================================
async function assertNoOverlap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  sessionDate: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string,
) {
  let query = supabase
    .from("sessions")
    .select("id, start_time, end_time")
    .eq("instructor_id", instructorId)
    .eq("session_date", sessionDate)
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeSessionId) query = query.neq("id", excludeSessionId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    throw new Error("ผู้สอนคนนี้ถูกจองไว้แล้วในช่วงเวลานี้ กรุณาเลือกเวลาอื่นหรือผู้สอนคนอื่น");
  }
}

async function checkAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  sessionDate: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("instructor_availability")
    .select("day_of_week, is_closed, start_time, end_time")
    .eq("instructor_id", instructorId);
  return isWithinAvailability(dayOfWeekOf(sessionDate), startTime, endTime, data ?? []);
}

function readScheduleFields(formData: FormData) {
  return {
    instructor_id: String(formData.get("instructor_id") || ""),
    student_name: String(formData.get("student_name") || "") || null,
    session_date: String(formData.get("session_date") || ""),
    start_time: String(formData.get("start_time") || ""),
    end_time: String(formData.get("end_time") || ""),
    course_type: String(formData.get("course_type") || "custom"),
    custom_price: Number(formData.get("price") || 0),
  };
}

type PackageMatch = { id: string; legacyPrice: number | null; legacyPayout: number | null };

/** Finds the student's active package for this instructor/course_type with sessions
 *  left, and bumps its used_sessions by 1. Returns the package (with any locked-in legacy
 *  price/payout) to store on the new session, or null if there's no matching package
 *  (session is just billed alone at the current rate). */
async function linkToPackage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  studentName: string | null,
  courseType: string,
): Promise<PackageMatch | null> {
  if (!studentName?.trim() || !isPackageCourseType(courseType)) return null;

  const { data: candidates } = await supabase
    .from("course_packages")
    .select("id, used_sessions, total_sessions, legacy_price, legacy_payout")
    .eq("instructor_id", instructorId)
    .eq("course_type", courseType)
    .eq("status", "active")
    .ilike("student_name", studentName.trim());

  const match = (candidates ?? []).find((p) => p.used_sessions < p.total_sessions);
  if (!match) return null;

  await supabase
    .from("course_packages")
    .update({ used_sessions: match.used_sessions + 1 })
    .eq("id", match.id);

  return { id: match.id, legacyPrice: match.legacy_price, legacyPayout: match.legacy_payout };
}

/** Undoes linkToPackage's count when a linked session is cancelled. */
async function unlinkFromPackage(supabase: Awaited<ReturnType<typeof createClient>>, packageId: string | null) {
  if (!packageId) return;

  const { data: pkg } = await supabase
    .from("course_packages")
    .select("used_sessions")
    .eq("id", packageId)
    .single();
  if (!pkg) return;

  await supabase
    .from("course_packages")
    .update({ used_sessions: Math.max(0, pkg.used_sessions - 1) })
    .eq("id", packageId);
}

export async function createSchedule(formData: FormData) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();
    const { custom_price, ...fields } = readScheduleFields(formData);
    if (!fields.instructor_id) throw new Error("กรุณาเลือกผู้สอน");
    if (fields.end_time <= fields.start_time) throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");

    await assertNoOverlap(supabase, fields.instructor_id, fields.session_date, fields.start_time, fields.end_time);

    const { data: instructor } = await supabase
      .from("profiles")
      .select("full_name, rate_type, rate_value")
      .eq("id", fields.instructor_id)
      .single();
    if (!instructor) throw new Error("ไม่พบผู้สอน");

    const withinAvailability = await checkAvailability(
      supabase,
      fields.instructor_id,
      fields.session_date,
      fields.start_time,
      fields.end_time,
    );
    const overrideAvailability = formData.get("override_availability") === "true";
    if (!withinAvailability && !overrideAvailability) {
      return { needsAvailabilityConfirm: true as const, instructorName: instructor.full_name };
    }

    const pkg = await linkToPackage(supabase, fields.instructor_id, fields.student_name, fields.course_type);

    const { price, instructor_payout } =
      pkg?.legacyPrice != null
        ? { price: pkg.legacyPrice, instructor_payout: pkg.legacyPayout ?? 0 }
        : resolvePricing(
            fields.course_type,
            custom_price,
            instructor.rate_type,
            instructor.rate_value,
            durationHours(fields.start_time, fields.end_time),
          );

    const { error } = await supabase.from("sessions").insert({
      ...fields,
      price,
      instructor_payout,
      package_id: pkg?.id ?? null,
      created_by: adminId,
      outside_availability: !withinAvailability,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    revalidatePath("/admin/list");
    revalidatePath("/admin/packages");
  });
}

export type BulkScheduleResult = {
  created: number;
  failed: { name: string; reason: string }[];
  outsideAvailability: string[];
};

/** One shared date/time, one row per checked instructor (own student_name + price each).
 *  Unlike the single-booking form, this doesn't stop to ask "still book it?" per instructor
 *  — checking many people into one shared time slot is already a deliberate admin action,
 *  so out-of-availability rows are just flagged (outside_availability: true) and reported
 *  back in `outsideAvailability`. Each flagged instructor still gets the normal
 *  accept/reject prompt on their own side. */
export async function createBulkSchedule(formData: FormData) {
  return asResult(async (): Promise<BulkScheduleResult> => {
    const { supabase, adminId } = await requireAdmin();

    const session_date = String(formData.get("session_date") || "");
    const start_time = String(formData.get("start_time") || "");
    const end_time = String(formData.get("end_time") || "");
    if (end_time <= start_time) throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");

    const instructorIds = formData.getAll("instructor_ids").map(String);
    if (instructorIds.length === 0) throw new Error("กรุณาเลือกผู้สอนอย่างน้อย 1 คน");

    const result: BulkScheduleResult = { created: 0, failed: [], outsideAvailability: [] };

    for (const instructorId of instructorIds) {
      const { data: instructor } = await supabase
        .from("profiles")
        .select("full_name, rate_type, rate_value")
        .eq("id", instructorId)
        .single();
      const name = instructor?.full_name ?? instructorId;

      try {
        if (!instructor) throw new Error("ไม่พบผู้สอน");

        await assertNoOverlap(supabase, instructorId, session_date, start_time, end_time);

        const student_name = String(formData.get(`student_name__${instructorId}`) || "") || null;
        const course_type = String(formData.get(`course_type__${instructorId}`) || "custom");
        const custom_price = Number(formData.get(`price__${instructorId}`) || 0);

        const withinAvailability = await checkAvailability(supabase, instructorId, session_date, start_time, end_time);
        if (!withinAvailability) result.outsideAvailability.push(name);

        const pkg = await linkToPackage(supabase, instructorId, student_name, course_type);

        const { price, instructor_payout } =
          pkg?.legacyPrice != null
            ? { price: pkg.legacyPrice, instructor_payout: pkg.legacyPayout ?? 0 }
            : resolvePricing(
                course_type,
                custom_price,
                instructor.rate_type,
                instructor.rate_value,
                durationHours(start_time, end_time),
              );

        const { error } = await supabase.from("sessions").insert({
          instructor_id: instructorId,
          student_name,
          session_date,
          start_time,
          end_time,
          course_type,
          price,
          instructor_payout,
          package_id: pkg?.id ?? null,
          created_by: adminId,
          outside_availability: !withinAvailability,
        });
        if (error) throw new Error(error.message);

        result.created += 1;
      } catch (e) {
        result.failed.push({ name, reason: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" });
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/list");
    revalidatePath("/admin/packages");
    return result;
  });
}

export async function updateSchedule(sessionId: string, formData: FormData) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existing) throw new Error("ไม่พบรายการ");

    const { custom_price, ...fields } = readScheduleFields(formData);
    if (fields.end_time <= fields.start_time) throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");

    await assertNoOverlap(
      supabase,
      fields.instructor_id,
      fields.session_date,
      fields.start_time,
      fields.end_time,
      sessionId,
    );

    const { data: instructor } = await supabase
      .from("profiles")
      .select("rate_type, rate_value")
      .eq("id", fields.instructor_id)
      .single();
    if (!instructor) throw new Error("ไม่พบผู้สอน");

    const { price, instructor_payout } = resolvePricing(
      fields.course_type,
      custom_price,
      instructor.rate_type,
      instructor.rate_value,
      durationHours(fields.start_time, fields.end_time),
    );

    const { error } = await supabase
      .from("sessions")
      .update({ ...fields, price, instructor_payout, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "update",
      changed_by: adminId,
      old_data: existing,
      new_data: { ...existing, ...fields, price, instructor_payout },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/list");
  });
}

export async function deleteSchedule(sessionId: string) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existing) throw new Error("ไม่พบรายการ");

    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) throw new Error(error.message);

    await unlinkFromPackage(supabase, existing.package_id);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "delete",
      changed_by: adminId,
      old_data: existing,
      new_data: null,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/list");
    revalidatePath("/admin/packages");
  });
}

/** Reassigns a class to a substitute instructor (e.g. the original can't make it) —
 *  the class fully becomes the substitute's from here on (their schedule, their payout),
 *  with the original instructor kept only in audit_log for history. For "custom"
 *  course_type, payout is recomputed off the substitute's own rate_type/rate_value;
 *  fixed course types pay the same regardless of who teaches. Can be done any time,
 *  before or after the class. */
export async function substituteInstructor(sessionId: string, newInstructorId: string) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existing) throw new Error("ไม่พบรายการ");
    if (existing.instructor_id === newInstructorId) throw new Error("ผู้สอนคนนี้สอนอยู่แล้ว");

    await assertNoOverlap(
      supabase,
      newInstructorId,
      existing.session_date,
      existing.start_time,
      existing.end_time,
      sessionId,
    );

    const { data: newInstructor } = await supabase
      .from("profiles")
      .select("rate_type, rate_value")
      .eq("id", newInstructorId)
      .single();
    if (!newInstructor) throw new Error("ไม่พบผู้สอน");

    const update: Record<string, unknown> = {
      instructor_id: newInstructorId,
      updated_at: new Date().toISOString(),
      // Admin explicitly picked this instructor (often to resolve the original one
      // rejecting an outside-availability booking) — treat it as a clean, confirmed
      // reassignment rather than re-running the availability check on the substitute.
      outside_availability: false,
      instructor_confirmed_at: null,
      instructor_rejected_at: null,
    };
    if (!isFixedCourseType(existing.course_type)) {
      update.instructor_payout = computePayout(newInstructor.rate_type, newInstructor.rate_value, existing.price);
    }

    const { error } = await supabase.from("sessions").update(update).eq("id", sessionId);
    if (error) throw new Error(error.message);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "substitute",
      changed_by: adminId,
      old_data: existing,
      new_data: { ...existing, ...update },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/list");
  });
}

// ============================================================
// finish (admin confirming on behalf of a staff who forgot) + payment approval
// ============================================================
export async function adminConfirmFinished(sessionId: string) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existing) throw new Error("ไม่พบรายการ");
    if (existing.finished_at) return;

    const { error } = await supabase
      .from("sessions")
      .update({ finished_by: adminId, finished_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "finish",
      changed_by: adminId,
      old_data: existing,
      new_data: { ...existing, finished_by: adminId, finished_at: new Date().toISOString() },
    });

    revalidatePath("/admin");
  });
}

/** Confirms every session that has already started but nobody has marked finished yet.
 *  Keeps going even if one fails (self-heals next time this runs). */
export async function adminConfirmAllTeaching() {
  return asResult(async () => {
    const { supabase } = await requireAdmin();

    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);
    const nowTime = nowIso.slice(11, 19);

    const { data: due } = await supabase
      .from("sessions")
      .select("id")
      .is("finished_at", null)
      .or(`session_date.lt.${today},and(session_date.eq.${today},start_time.lte.${nowTime})`);

    for (const row of due ?? []) {
      await adminConfirmFinished(row.id);
    }
  });
}

export async function approvePayment(sessionId: string, payoutOverride?: number) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existing) throw new Error("ไม่พบรายการ");
    if (existing.paid_at) return;

    const update: Record<string, unknown> = { paid_by: adminId, paid_at: new Date().toISOString() };
    if (typeof payoutOverride === "number" && !Number.isNaN(payoutOverride)) {
      update.instructor_payout = payoutOverride;
    }

    const { error } = await supabase.from("sessions").update(update).eq("id", sessionId);
    if (error) throw new Error(error.message);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "pay",
      changed_by: adminId,
      old_data: existing,
      new_data: { ...existing, ...update },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/list");
  });
}

/** Approves every finished-but-unpaid session for an instructor. Keeps going even if one
 *  fails (self-heals next time this runs). */
export async function approveAllForInstructor(instructorId: string) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();

    const { data: pending } = await supabase
      .from("sessions")
      .select("id")
      .eq("instructor_id", instructorId)
      .not("finished_at", "is", null)
      .is("paid_at", null);

    for (const row of pending ?? []) {
      await approvePayment(row.id);
    }
  });
}

// ============================================================
// student course packages
// ============================================================
export async function createPackage(formData: FormData) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const student_name = String(formData.get("student_name") || "").trim();
    const instructor_id = String(formData.get("instructor_id") || "");
    const course_type = String(formData.get("course_type") || "");
    const total_sessions = Number(formData.get("total_sessions") || 10);
    const used_sessions = Number(formData.get("used_sessions") || 0);
    const notes = String(formData.get("notes") || "").trim() || null;
    const useLegacyPricing = formData.get("use_legacy_pricing") === "on";
    const legacy_price = useLegacyPricing ? Number(formData.get("legacy_price") || 0) : null;
    const legacy_payout = useLegacyPricing ? Number(formData.get("legacy_payout") || 0) : null;

    if (!student_name) throw new Error("กรุณากรอกชื่อผู้เรียน");
    if (!instructor_id) throw new Error("กรุณาเลือกผู้สอน");
    if (!isPackageCourseType(course_type)) throw new Error("ประเภทคอร์สไม่ถูกต้อง");
    if (total_sessions <= 0) throw new Error("จำนวนครั้งทั้งหมดต้องมากกว่า 0");
    if (used_sessions < 0) throw new Error("จำนวนครั้งที่ใช้ไปแล้วต้องไม่ติดลบ");

    const { error } = await supabase.from("course_packages").insert({
      student_name,
      instructor_id,
      course_type,
      total_sessions,
      used_sessions,
      notes,
      legacy_price,
      legacy_payout,
      created_by: adminId,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/packages");
  });
}

export async function updatePackage(packageId: string, formData: FormData) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();

    const student_name = String(formData.get("student_name") || "").trim();
    const instructor_id = String(formData.get("instructor_id") || "");
    const total_sessions = Number(formData.get("total_sessions") || 10);
    const used_sessions = Number(formData.get("used_sessions") || 0);
    const status = String(formData.get("status") || "active");
    const notes = String(formData.get("notes") || "").trim() || null;
    const useLegacyPricing = formData.get("use_legacy_pricing") === "on";
    const legacy_price = useLegacyPricing ? Number(formData.get("legacy_price") || 0) : null;
    const legacy_payout = useLegacyPricing ? Number(formData.get("legacy_payout") || 0) : null;

    if (!student_name) throw new Error("กรุณากรอกชื่อผู้เรียน");
    if (!instructor_id) throw new Error("กรุณาเลือกผู้สอน");
    if (total_sessions <= 0) throw new Error("จำนวนครั้งทั้งหมดต้องมากกว่า 0");
    if (used_sessions < 0) throw new Error("จำนวนครั้งที่ใช้ไปแล้วต้องไม่ติดลบ");

    const { error } = await supabase
      .from("course_packages")
      .update({
        student_name,
        instructor_id,
        total_sessions,
        used_sessions,
        status,
        notes,
        legacy_price,
        legacy_payout,
      })
      .eq("id", packageId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/packages");
  });
}

/** Sessions already linked to this package just lose the link (package_id -> null,
 *  set by the FK's "on delete set null") — their price/payout/history stays intact. */
export async function deletePackage(packageId: string) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("course_packages").delete().eq("id", packageId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/packages");
    revalidatePath("/admin");
    revalidatePath("/admin/list");
  });
}

// ============================================================
// package-link audit (bookkeeping fix for sessions that should have
// counted against a package but never got linked)
// ============================================================

/** Links a not-yet-linked session to a package and bumps used_sessions by 1 — the
 *  fix for [[audit findings]] where a session's name+instructor+course-type clearly
 *  matches an existing package but was never counted against it (booked before the
 *  package existed, or the wrong course type was picked at the time). Only touches
 *  the count — the session's own price/instructor_payout/course_type are left exactly
 *  as originally recorded, since that money already changed hands; this just corrects
 *  the package's remaining-session tally. Writes an audit_log entry so there's a
 *  record of what was adjusted and why. */
export async function linkOrphanedSessionToPackage(sessionId: string, packageId: string) {
  return asResult(async () => {
    const { supabase, adminId } = await requireAdmin();

    const { data: existingSession } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    if (!existingSession) throw new Error("ไม่พบคาบเรียน");
    if (existingSession.package_id) throw new Error("คาบนี้ถูกเชื่อมกับคอร์สอื่นไปแล้ว");

    const { data: pkg } = await supabase.from("course_packages").select("*").eq("id", packageId).single();
    if (!pkg) throw new Error("ไม่พบคอร์ส");
    if (pkg.instructor_id !== existingSession.instructor_id) throw new Error("ผู้สอนของคาบนี้ไม่ตรงกับคอร์ส");

    const newUsedSessions = pkg.used_sessions + 1;

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ package_id: packageId })
      .eq("id", sessionId);
    if (sessionError) throw new Error(sessionError.message);

    const { error: pkgError } = await supabase
      .from("course_packages")
      .update({ used_sessions: newUsedSessions })
      .eq("id", packageId);
    if (pkgError) throw new Error(pkgError.message);

    await supabase.from("audit_log").insert({
      session_id: sessionId,
      action: "update",
      changed_by: adminId,
      old_data: { ...existingSession, _package_used_sessions_before: pkg.used_sessions },
      new_data: {
        ...existingSession,
        package_id: packageId,
        _package_used_sessions_after: newUsedSessions,
        _source: "package_audit_fix",
      },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/admin/packages/audit");
    return { newUsedSessions, totalSessions: pkg.total_sessions };
  });
}

// ============================================================
// instructor weekly availability
// ============================================================
export async function updateInstructorAvailability(instructorId: string, formData: FormData) {
  return asResult(async () => {
    const { supabase } = await requireAdmin();
    await saveAvailability(supabase, instructorId, formData);
    revalidatePath("/admin/instructors");
  });
}
