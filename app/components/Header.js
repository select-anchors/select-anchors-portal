"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/driver/my-day", label: "My Day" },
    { href: "/wells/30-015-54321", label: "Well Detail" },
    { href: "/account", label: "Account" },
  ];

  return (
    <header className="site-header border-b border-gray-200">
      <div className="container h-14 flex items-center justify-between">
        {/* Logo + Title always go to dashboard */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-green/90 flex items-center justify-center text-white font-bold">
            SA
          </div>
          <div className="tracking-wide text-xl font-bold">SELECT ANCHORS</div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`hover:opacity-80 ${
                pathname === item.href ? "font-bold text-brand-green" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="btn btn-secondary">
            Client Login
          </Link>
        </nav>

        {/* Mobile hamburger button */}
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
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container py-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`${
                  pathname === item.href ? "font-bold text-brand-green" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
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
