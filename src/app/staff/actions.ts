"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmFinished(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");

  const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (!existing) throw new Error("ไม่พบรายการ");
  if (existing.instructor_id !== user.id) throw new Error("ไม่มีสิทธิ์ยืนยันรายการนี้");
  if (existing.finished_at) return;

  const { error } = await supabase
    .from("sessions")
    .update({ finished_by: user.id, finished_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    session_id: sessionId,
    action: "finish",
    changed_by: user.id,
    old_data: existing,
    new_data: { ...existing, finished_by: user.id, finished_at: new Date().toISOString() },
  });

  revalidatePath("/staff");
}

export async function updateOwnPayoutInfo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");

  let qrCodeUrl = String(formData.get("existing_qr_code_url") || "") || null;
  const qrFile = formData.get("qr_code");
  if (qrFile instanceof File && qrFile.size > 0) {
    const ext = qrFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payout-qr").upload(path, qrFile);
    if (uploadError) throw new Error(`อัปโหลด QR ไม่สำเร็จ: ${uploadError.message}`);
    qrCodeUrl = supabase.storage.from("payout-qr").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: String(formData.get("phone") || "") || null,
      bank_name: String(formData.get("bank_name") || "") || null,
      bank_account_number: String(formData.get("bank_account_number") || "") || null,
      bank_account_name: String(formData.get("bank_account_name") || "") || null,
      qr_code_url: qrCodeUrl,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/staff");
}
