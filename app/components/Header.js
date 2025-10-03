"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = (usePathname() || "/").replace(/\/+$/, "") || "/";

  const base = "pb-1 transition-colors";
  const inactive = "text-gray-700 hover:text-gray-900 hover:opacity-90";
  const active   = "text-gray-900 font-extrabold border-b-2 border-[#2f4f4f]";
  const is = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="site-header border-b border-gray-200 bg-white">
      <div className="container h-14 flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#2f4f4f] flex items-center justify-center text-white font-bold">SA</div>
          <div className="tracking-wide text-xl font-bold">SELECT ANCHORS</div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className={`${base} ${is("/dashboard") ? active : inactive}`}>Dashboard</Link>
          <Link href="/driver/my-day" className={`${base} ${is("/driver/my-day") ? active : inactive}`}>My Day</Link>
          <Link href="/wells/30-015-54321" className={`${base} ${is("/wells") ? active : inactive}`}>Well Detail</Link>
          <Link href="/account" className={`${base} ${is("/account") ? active : inactive}`}>Account</Link>
          <Link href="/login" className="btn btn-secondary">Client Login</Link>
        </nav>

        {/* Mobile button */}
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
          <div className="container py-3 flex flex-col gap-3 px-4 md:px-6">
            <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link href="/driver/my-day" onClick={() => setOpen(false)}>My Day</Link>
            <Link href="/wells/30-015-54321" onClick={() => setOpen(false)}>Well Detail</Link>
            <Link href="/account" onClick={() => setOpen(false)}>Account</Link>
            <Link href="/login" className="btn btn-secondary w-fit" onClick={() => setOpen(false)}>Client Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}
