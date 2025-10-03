"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = (usePathname() || "/").replace(/\/+$/, "") || "/";

  // Active link helpers
  const base = "pb-1 transition-colors";
  const inactive = "text-gray-700 hover:text-gray-900 hover:opacity-90";
  const active = "text-gray-900 font-extrabold border-b-2 border-[var(--brand-green)]";
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  // Mobile link (closes menu + applies active styling)
  const MobileLink = ({ href, children, className = "" }) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`${isActive(href) ? "font-extrabold text-gray-900" : "text-gray-800"} ${className}`}
    >
      {children}
    </Link>
  );

  return (
    <header className="site-header border-b border-gray-200 bg-white">
      <div className="container h-14 flex items-center justify-between px-4 md:px-6">
        {/* Logo + Title → Dashboard */}
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3"
          aria-label="Go to Dashboard"
        >
          <div className="h-8 w-8 rounded-lg bg-brand-green/90 flex items-center justify-center text-white font-bold">
            SA
          </div>
          <div className="tracking-wide text-xl font-bold">SELECT ANCHORS</div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className={`${base} ${isActive("/dashboard") ? active : inactive}`}>
            Dashboard
          </Link>
          <Link href="/driver/my-day" className={`${base} ${isActive("/driver/my-day") ? active : inactive}`}>
            My Day
          </Link>
          <Link href="/wells/30-015-54321" className={`${base} ${isActive("/wells") ? active : inactive}`}>
            Well Detail
          </Link>
          <Link href="/account" className={`${base} ${isActive("/account") ? active : inactive}`}>
            Account
          </Link>
          <Link href="/login" className="btn btn-secondary">Client Login</Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg border border-gray-300"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black"></div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-gray-200">
          <div className="container py-3 flex flex-col gap-3 px-4 md:px-6">
            <MobileLink href="/dashboard">Dashboard</MobileLink>
            <MobileLink href="/driver/my-day">My Day</MobileLink>
            {/* Treat any /wells/* as active */}
            <MobileLink href="/wells/30-015-54321">Well Detail</MobileLink>
            <MobileLink href="/account">Account</MobileLink>
            <Link
              href="/login"
              className="btn btn-secondary w-fit"
              onClick={() => setOpen(false)}
            >
              Client Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
