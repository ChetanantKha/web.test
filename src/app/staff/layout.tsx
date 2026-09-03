import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import FinishPrompt from "@/components/FinishPrompt";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-end rounded-xl border border-white/60 bg-gradient-to-r from-rose-50 to-blue-50 p-3 shadow-sm">
        <LogoutButton />
      </div>
      {children}
      <FinishPrompt instructorId={user.id} />
    </div>
  );
}
