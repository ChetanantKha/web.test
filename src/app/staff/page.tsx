import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffPayoutForm from "@/components/StaffPayoutForm";
import StaffSessionList from "@/components/StaffSessionList";
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

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("instructor_id", user.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  const list = (sessions ?? []) as Session[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">สวัสดี {profile?.full_name ?? ""}</h1>
        <p className="text-sm text-gray-500">ตารางสอนทั้งหมดของฉัน (แอดมินเป็นผู้จัดตารางให้)</p>
      </div>

      {profile && <StaffPayoutForm profile={profile as Profile} />}

      <StaffSessionList sessions={list} />
    </div>
  );
}
