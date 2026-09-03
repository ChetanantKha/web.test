import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";
import type { Settings } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/staff");

  const { data: settings } = await supabase.from("settings").select("*").eq("id", 1).single();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">ตั้งค่า</h1>

      {settings && <SettingsForm settings={settings as Settings} />}
    </div>
  );
}
