"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SKILL_TRICKS, type SkillLevel } from "@/lib/skillTricks";

/** Any logged-in instructor or admin may use these — checklist data is shared teaching
 *  notes, not payroll, so unlike admin/actions.ts's requireAdmin() this only needs a
 *  session, not a specific role. See migration_student_skill_tracking.sql's RLS policies
 *  (same "any signed-in user" scope, enforced again here for a clean error message). */
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");
  return { supabase, userId: user.id };
}

/** Server Action errors thrown here are redacted to a generic placeholder in production
 *  (see nextjs-custom-fork-gotchas) — return { error } instead, same convention as
 *  admin/actions.ts and staff/actions.ts. */
async function asResult<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

function revalidateStudentPaths(studentId: string) {
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/staff/students/${studentId}`);
  revalidatePath("/admin/students");
  revalidatePath("/staff/students");
}

/** Finds a student by exact-insensitive name match (typically a name pulled from an existing
 *  Basic-course session/package via listBasicCourseStudentNames), or creates one — lets an
 *  instructor open a checklist for someone already enrolled without retyping their name.
 *  ilike match mirrors the same tolerance admin/actions.ts's linkToPackage() already uses for
 *  matching a session to a package by student name. */
export async function findOrCreateStudent(fullNameRaw: string) {
  return asResult(async () => {
    const { supabase, userId } = await requireAuth();
    const full_name = fullNameRaw.trim();
    if (!full_name) throw new Error("ไม่พบชื่อนักเรียน");

    const { data: existing } = await supabase.from("students").select("id").ilike("full_name", full_name).limit(1).maybeSingle();
    if (existing) return { id: existing.id as string };

    const { data, error } = await supabase.from("students").insert({ full_name, created_by: userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: data.id as string };
  });
}

export async function createStudent(formData: FormData) {
  return asResult(async () => {
    const { supabase, userId } = await requireAuth();
    const full_name = String(formData.get("full_name") || "").trim();
    if (!full_name) throw new Error("กรุณากรอกชื่อนักเรียน");
    const parent_phone = String(formData.get("parent_phone") || "").trim() || null;

    const { data, error } = await supabase
      .from("students")
      .insert({ full_name, parent_phone, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/admin/students");
    revalidatePath("/staff/students");
    return { id: data.id as string };
  });
}

/** Sets (or updates) a trick's proficiency level + optional note. `notes` is always optional
 *  — an empty/omitted value is stored as null, never required. */
export async function setSkillLevel(studentId: string, trickKey: string, level: SkillLevel, notes: string) {
  return asResult(async () => {
    const { supabase, userId } = await requireAuth();
    if (!SKILL_TRICKS.some((t) => t.key === trickKey)) throw new Error("ไม่พบท่านี้ในหลักสูตร");
    if (![1, 2, 3].includes(level)) throw new Error("ระดับไม่ถูกต้อง");

    const { error } = await supabase.from("student_skill_checks").upsert(
      {
        student_id: studentId,
        trick_key: trickKey,
        level,
        notes: notes.trim() || null,
        checked_by: userId,
        checked_at: new Date().toISOString(),
      },
      { onConflict: "student_id,trick_key" },
    );
    if (error) throw new Error(error.message);

    revalidateStudentPaths(studentId);
  });
}

/** Fully un-rates a trick (back to "not yet rated"), distinct from picking a low level. */
export async function clearSkillCheck(studentId: string, trickKey: string) {
  return asResult(async () => {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("student_skill_checks")
      .delete()
      .eq("student_id", studentId)
      .eq("trick_key", trickKey);
    if (error) throw new Error(error.message);

    revalidateStudentPaths(studentId);
  });
}
