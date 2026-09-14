"use server";

import { createClient } from "@/lib/supabase/server";

/** Returns an error message on failure instead of throwing — Server Action errors that
 *  cross to the client via `throw` have their message redacted to a generic placeholder
 *  in production builds of this Next.js version, so "expected" failures (wrong nickname,
 *  wrong password) must be modeled as a return value to actually reach the user. */
export async function loginWithNickname(nickname: string): Promise<{ error: string } | void> {
  const trimmed = nickname.trim();
  if (!trimmed) return { error: "กรุณากรอกชื่อเล่น" };

  const supabase = await createClient();

  const { data: email, error: lookupError } = await supabase.rpc("email_for_nickname", {
    p_nickname: trimmed,
  });
  if (lookupError) return { error: lookupError.message };
  if (!email) return { error: "ไม่พบชื่อเล่นนี้ในระบบ กรุณาติดต่อแอดมิน" };

  const sharedPassword = process.env.LOGIN_SHARED_PASSWORD;
  if (!sharedPassword) return { error: "ระบบยังไม่ได้ตั้งค่ารหัสผ่านกลาง ติดต่อผู้ดูแลระบบ" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: sharedPassword,
  });
  if (signInError) return { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาติดต่อแอดมิน" };
}
