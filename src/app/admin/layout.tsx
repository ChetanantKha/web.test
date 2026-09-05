import AdminNav from "@/components/AdminNav";
import PendingApprovals from "@/components/PendingApprovals";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <AdminNav />
      {children}
      <PendingApprovals />
    </div>
  );
}
