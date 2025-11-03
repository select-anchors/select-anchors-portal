// /app/components/Header.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`px-2 py-1 rounded-md hover:bg-gray-100 ${
        isActive ? "underline underline-offset-4" : ""
      }`}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const { data: session, status } = useSession();
  const role = session?.user?.role; // "admin" | "employee" | "customer" | undefined

  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";
  const isSignedIn = !!session?.user;

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-full bg-[#2f4f4f] text-white w-7 h-7 grid place-items-center text-sm font-bold">
            SA
          </div>
          <span className="font-semibold tracking-wide">SELECT ANCHORS</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {/* Everyone sees Dashboard */}
          <NavLink href="/dashboard">Dashboard</NavLink>

          {/* Replace “Well Detail” with All Wells */}
          {(isAdmin || isEmployee) && <NavLink href="/admin/wells">All Wells</NavLink>}
          {isCustomer && <NavLink href="/wells">All Wells</NavLink>}

          {/* My Day only for staff */}
          {(isAdmin || isEmployee) && <NavLink href="/driver/my-day">My Day</NavLink>}

          {/* Account / Auth */}
          {status === "loading" ? (
            <span className="text-gray-500 px-2">…</span>
          ) : isSignedIn ? (
            <>
              <NavLink href="/account">Account</NavLink>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-1 rounded-xl border px-3 py-1 hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-xl border px-3 py-1 hover:bg-gray-50">
              Client Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
