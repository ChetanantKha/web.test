"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Floating "go home" button, bottom-left — every other floating button in this app
 *  (PendingApprovals, RejectedSessionAlert, FinishPrompt) sits bottom/top-right, so this
 *  corner is clear. Hidden on the home page itself (nothing to navigate to) and when
 *  printing. */
export default function HomeButton({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname === href) return null;

  return (
    <Link
      href={href}
      aria-label="กลับหน้าหลัก"
      className="active:scale-95 transition-transform duration-100 fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-blue-950 text-white shadow-lg hover:bg-blue-900 print:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M5 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
