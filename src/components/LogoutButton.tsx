"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={
        variant === "dark"
          ? "rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10"
          : "rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      }
    >
      ออกจากระบบ
    </button>
  );
}
