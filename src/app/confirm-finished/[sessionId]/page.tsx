import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyFinishToken } from "@/lib/confirmToken";
import { COURSE_TYPE_LABEL, type CourseType } from "@/lib/courseTypes";
import { formatThaiDate } from "@/lib/date";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <Image src="/logo.jpg" alt="T-STAR Academy" width={48} height={48} className="mx-auto rounded-lg" />
        {children}
      </div>
    </div>
  );
}

export default async function ConfirmFinishedPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { sessionId } = await params;
  const { token } = await searchParams;

  if (!verifyFinishToken(sessionId, token)) {
    return (
      <Shell>
        <p className="text-4xl">⚠️</p>
        <h1 className="text-lg font-semibold text-gray-800">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="text-sm text-gray-500">กรุณาเปิดแอปแล้วกดยืนยันการสอนจากในระบบแทน</p>
      </Shell>
    );
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).single();

  if (!existing) {
    return (
      <Shell>
        <p className="text-4xl">❓</p>
        <h1 className="text-lg font-semibold text-gray-800">ไม่พบรายการนี้</h1>
        <p className="text-sm text-gray-500">คลาสนี้อาจถูกลบไปแล้ว</p>
      </Shell>
    );
  }

  const details = (
    <div className="space-y-1 rounded-xl bg-orange-50 p-4 text-left text-sm text-gray-700">
      <p>
        <span className="text-gray-500">วันที่</span> {formatThaiDate(existing.session_date)}
      </p>
      <p>
        <span className="text-gray-500">เวลา</span> {existing.start_time.slice(0, 5)}-{existing.end_time.slice(0, 5)} น.
      </p>
      <p>
        <span className="text-gray-500">นักเรียน</span> {existing.student_name ?? "-"}
      </p>
      <p>
        <span className="text-gray-500">ประเภทคอร์ส</span>{" "}
        {COURSE_TYPE_LABEL[existing.course_type as CourseType] ?? existing.course_type}
      </p>
      <p>
        <span className="text-gray-500">ยอดจ่ายผู้สอน</span>{" "}
        <span className="font-semibold text-orange-700">{existing.instructor_payout.toLocaleString()} บาท</span>
      </p>
    </div>
  );

  if (existing.finished_at) {
    return (
      <Shell>
        <p className="text-4xl">✅</p>
        <h1 className="text-lg font-semibold text-gray-800">ยืนยันไปแล้วก่อนหน้านี้</h1>
        {details}
      </Shell>
    );
  }

  const now = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ finished_by: existing.instructor_id, finished_at: now, updated_at: now })
    .eq("id", sessionId);

  await supabase.from("audit_log").insert({
    session_id: sessionId,
    action: "finish",
    changed_by: existing.instructor_id,
    old_data: existing,
    new_data: { ...existing, finished_by: existing.instructor_id, finished_at: now },
  });

  return (
    <Shell>
      <p className="text-4xl">🎉</p>
      <h1 className="text-lg font-semibold text-gray-800">ยืนยันการสอนเสร็จสิ้นเรียบร้อย</h1>
      {details}
      <p className="text-xs text-gray-400">รายการนี้จะเข้าคิวรอแอดมินอนุมัติจ่ายเงินต่อไป</p>
    </Shell>
  );
}
