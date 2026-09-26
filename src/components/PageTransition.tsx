"use client";

import { usePathname } from "next/navigation";

/** Fades/slides in just the page content on navigation — deliberately placed inside each
 *  layout's `children` slot (admin/staff), never wrapping the layout itself. Keying on
 *  pathname here would force a full remount of whatever it wraps; wrapping the whole layout
 *  would tear down and re-mount persistent chrome (nav, realtime popups like
 *  PendingApprovals/FinishPrompt) on every navigation, which is both wasteful and would reset
 *  their state. CSS-only (transform/opacity, GPU-cheap), short duration, and disabled for
 *  reduced-motion/print via globals.css. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
