import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffPayoutForm from "@/components/StaffPayoutForm";
import StaffSessionList from "@/components/StaffSessionList";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import { updateOwnAvailability } from "@/app/staff/actions";
import type { AvailabilityDay } from "@/lib/availability";
import type { Profile, Session } from "@/lib/types";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/admin");

  const [{ data: sessions }, { data: availability }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("instructor_id", user.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase
      .from("instructor_availability")
      .select("day_of_week, is_closed, start_time, end_time")
      .eq("instructor_id", user.id),
  ]);

  const list = (sessions ?? []) as Session[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">สวัสดี {profile?.full_name ?? ""}</h1>
        <p className="text-sm text-gray-500">ตารางสอนทั้งหมดของฉัน (แอดมินเป็นผู้จัดตารางให้)</p>
      </div>

      {profile && <StaffPayoutForm profile={profile as Profile} />}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">เวลาที่ฉันรับสอน</h2>
        <AvailabilityEditor rows={(availability ?? []) as AvailabilityDay[]} saveAction={updateOwnAvailability} />
      </div>

      <StaffSessionList sessions={list} />
    </div>
  );
}
