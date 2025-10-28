"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkCls = (href) =>
    `hover:opacity-80 ${pathname === href ? "font-semibold text-black" : ""}`;

  return (
    <header className="site-header">
      <div className="container h-14 flex items-center justify-between">
        {/* Logo + Title -> always to /dashboard */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-green/90 flex items-center justify-center text-white font-bold">SA</div>
          <div className="tracking-wide text-xl font-bold">SELECT ANCHORS</div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className={linkCls("/dashboard")}>Dashboard</Link>
          <Link href="/driver/my-day" className={linkCls("/driver/my-day")}>My Day</Link>
          <Link href="/admin/wells" className={linkCls("/admin/wells")}>All Wells</Link>
          <Link href="/account" className={linkCls("/account")}>Account</Link>
          <Link href="/login" className="btn btn-secondary">Client Login</Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg border border-gray-300"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black"></div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-200">
          <div className="container py-3 flex flex-col gap-3">
            <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link href="/driver/my-day" onClick={() => setOpen(false)}>My Day</Link>
            <Link href="/admin/wells" onClick={() => setOpen(false)}>All Wells</Link>
            <Link href="/account" onClick={() => setOpen(false)}>Account</Link>
            <Link href="/login" className="btn btn-secondary w-fit" onClick={() => setOpen(false)}>Client Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}
