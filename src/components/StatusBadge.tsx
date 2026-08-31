import { getSessionStatus, statusColor, statusLabel, type Session } from "@/lib/types";

export default function StatusBadge({ session }: { session: Session }) {
  const status = getSessionStatus(session);
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
