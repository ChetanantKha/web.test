import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signs a session id into an opaque token so the "ยืนยันการสอนเสร็จสิ้น" button in an email
 * can mark that one session finished without the instructor being logged in anywhere.
 * Not a general auth token — only ever checked against the specific sessionId in the URL.
 */
function sign(sessionId: string): string {
  return createHmac("sha256", process.env.CONFIRM_TOKEN_SECRET!).update(sessionId).digest("base64url");
}

export function signFinishToken(sessionId: string): string {
  return sign(sessionId);
}

export function verifyFinishToken(sessionId: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = sign(sessionId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
