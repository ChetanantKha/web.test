"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computePayout } from "@/lib/payout";
import { FIXED_COURSE_TYPES, isFixedCourseType } from "@/lib/courseTypes";

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

// ============================================================
// instructor profiles
// ============================================================
export async function updateInstructorProfile(instructorId: string, formData: FormData) {
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
}

// ============================================================
// calendar settings
// ============================================================
export async function updateSettings(formData: FormData) {
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

/** Fixed course types always pay the same amount regardless of instructor; "custom" falls
 *  back to that instructor's own rate_type/rate_value (the pre-fixed-pricing behavior). */
function resolvePricing(
  courseType: string,
  customPrice: number,
  rateType: "fixed" | "percent",
  rateValue: number,
) {
  if (isFixedCourseType(courseType)) {
    const { price, payout } = FIXED_COURSE_TYPES[courseType];
    return { price, instructor_payout: payout };
  }
  return { price: customPrice, instructor_payout: computePayout(rateType, rateValue, customPrice) };
}

export async function createSchedule(formData: FormData) {
  const { supabase, adminId } = await requireAdmin();
  const { custom_price, ...fields } = readScheduleFields(formData);
  if (!fields.instructor_id) throw new Error("กรุณาเลือกผู้สอน");
  if (fields.end_time <= fields.start_time) throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");

  await assertNoOverlap(supabase, fields.instructor_id, fields.session_date, fields.start_time, fields.end_time);

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
  );

  const { error } = await supabase
    .from("sessions")
    .insert({ ...fields, price, instructor_payout, created_by: adminId });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/list");
}

export type BulkScheduleResult = {
  created: number;
  failed: { name: string; reason: string }[];
};

/** One shared date/time, one row per checked instructor (own student_name + price each). */
export async function createBulkSchedule(formData: FormData): Promise<BulkScheduleResult> {
  const { supabase, adminId } = await requireAdmin();

  const session_date = String(formData.get("session_date") || "");
  const start_time = String(formData.get("start_time") || "");
  const end_time = String(formData.get("end_time") || "");
  if (end_time <= start_time) throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");

  const instructorIds = formData.getAll("instructor_ids").map(String);
  if (instructorIds.length === 0) throw new Error("กรุณาเลือกผู้สอนอย่างน้อย 1 คน");

  const result: BulkScheduleResult = { created: 0, failed: [] };

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
      const { price, instructor_payout } = resolvePricing(
        course_type,
        custom_price,
        instructor.rate_type,
        instructor.rate_value,
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
        created_by: adminId,
      });
      if (error) throw new Error(error.message);

      result.created += 1;
    } catch (e) {
      result.failed.push({ name, reason: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/list");
  return result;
}

export async function updateSchedule(sessionId: string, formData: FormData) {
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
}

export async function deleteSchedule(sessionId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (!existing) throw new Error("ไม่พบรายการ");

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    session_id: sessionId,
    action: "delete",
    changed_by: adminId,
    old_data: existing,
    new_data: null,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/list");
}

// ============================================================
// finish (admin confirming on behalf of a staff who forgot) + payment approval
// ============================================================
export async function adminConfirmFinished(sessionId: string) {
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
}

/** Confirms every session that has already started but nobody has marked finished yet. */
export async function adminConfirmAllTeaching() {
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
}

export async function approvePayment(sessionId: string, payoutOverride?: number) {
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
}

export async function approveAllForInstructor(instructorId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { data: pending } = await supabase
    .from("sessions")
    .select("id")
    .eq("instructor_id", instructorId)
    .not("finished_at", "is", null)
    .is("paid_at", null);

  for (const row of pending ?? []) {
    await approvePayment(row.id);
  }
  void adminId;
}
