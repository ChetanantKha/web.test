"use server";

import { createClient } from "@/lib/supabase/server";

export async function loginWithNickname(nickname: string) {
  const trimmed = nickname.trim();
  if (!trimmed) throw new Error("กรุณากรอกชื่อเล่น");

  const supabase = await createClient();

  const { data: email, error: lookupError } = await supabase.rpc("email_for_nickname", {
    p_nickname: trimmed,
  });
  if (lookupError) throw new Error(lookupError.message);
  if (!email) throw new Error("ไม่พบชื่อเล่นนี้ในระบบ กรุณาติดต่อแอดมิน");

  const sharedPassword = process.env.LOGIN_SHARED_PASSWORD;
  if (!sharedPassword) throw new Error("ระบบยังไม่ได้ตั้งค่ารหัสผ่านกลาง ติดต่อผู้ดูแลระบบ");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: sharedPassword,
  });
  if (signInError) throw new Error("เข้าสู่ระบบไม่สำเร็จ กรุณาติดต่อแอดมิน");
}