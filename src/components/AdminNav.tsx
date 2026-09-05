"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const links = [
  { href: "/admin", label: "สถานะวันนี้" },
  { href: "/admin/calendar", label: "ปฏิทิน" },
  { href: "/admin/list", label: "รายการทั้งหมด" },
  { href: "/admin/instructors", label: "จัดการผู้สอน" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative flex items-center justify-end rounded-xl border border-white/60 bg-gradient-to-r from-rose-50 to-blue-50 p-3 shadow-sm"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="เมนู"
        className="rounded-lg p-2 hover:bg-white/60"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 w-52 space-y-1 rounded-xl border border-gray-200 bg-white p-2 text-sm shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 hover:bg-gray-100 ${
                pathname === link.href ? "bg-gray-100 font-medium" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-1">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
