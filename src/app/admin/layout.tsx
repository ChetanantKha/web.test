import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import PendingApprovals from "@/components/PendingApprovals";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/60 bg-gradient-to-r from-rose-50 to-blue-50 p-3 shadow-sm">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/admin" className="font-medium hover:underline">
            สถานะวันนี้
          </Link>
          <Link href="/admin/calendar" className="hover:underline">
            ปฏิทิน
          </Link>
          <Link href="/admin/list" className="hover:underline">
            รายการทั้งหมด
          </Link>
          <Link href="/admin/instructors" className="hover:underline">
            จัดการผู้สอน
          </Link>
          <Link href="/admin/settings" className="hover:underline">
            ตั้งค่า
          </Link>
        </nav>
        <LogoutButton />
      </div>
      {children}
      <PendingApprovals />
    </div>
  );
}
