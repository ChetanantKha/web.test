import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DayView from "@/components/DayView";
import { buildSlotTimes } from "@/lib/slots";
import { formatThaiDate } from "@/lib/date";
import type { Session } from "@/lib/types";

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/staff");

  const { date } = await params;

  const [{ data: settings }, { data: instructors }, { data: sessions }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "instructor")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("sessions")
      .select("*, profiles!instructor_id(full_name)")
      .eq("session_date", date)
      .order("start_time"),
  ]);

  const slotTimes = buildSlotTimes(
    settings?.business_start?.slice(0, 5) ?? "06:00",
    settings?.business_end?.slice(0, 5) ?? "21:00",
    settings?.slot_minutes ?? 60,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">ตารางวันที่ {formatThaiDate(date)}</h1>
        <Link href="/admin/calendar" className="text-sm underline">
          กลับปฏิทิน
        </Link>
      </div>

      <DayView
        date={date}
        slotTimes={slotTimes}
        slotMinutes={settings?.slot_minutes ?? 60}
        sessions={(sessions ?? []) as Session[]}
        instructors={instructors ?? []}
      />
    </div>
  );
}
