import AdminNav from "@/components/AdminNav";
import PendingApprovals from "@/components/PendingApprovals";
import RejectedSessionAlert from "@/components/RejectedSessionAlert";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: instructors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "instructor")
    .eq("is_active", true)
    .order("full_name");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 print:max-w-none print:p-0">
      <div className="print:hidden">
        <AdminNav />
      </div>
      {children}
      <div className="print:hidden">
        <PendingApprovals />
        <RejectedSessionAlert instructors={instructors ?? []} />
      </div>
    </div>
  );
}
