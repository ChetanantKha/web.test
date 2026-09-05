import { redirect } from "next/navigation";
import Image from "next/image";
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
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-blue-950 to-blue-900 p-3 shadow-md">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="T-STAR Academy" width={36} height={36} className="rounded-lg" />
          <span className="hidden text-sm font-semibold tracking-wide text-white sm:inline">T-STAR ACADEMY</span>
        </div>
        <LogoutButton variant="dark" />
      </div>
      {children}
      <FinishPrompt instructorId={user.id} />
    </div>
  );
}
