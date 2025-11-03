"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data } = useSession();
  const role = data?.user?.role; // "admin" | "employee" | "customer" | undefined

  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-full bg-[#2f4f4f] text-white w-7 h-7 grid place-items-center text-sm font-bold">SA</div>
          <span className="font-semibold">SELECT ANCHORS</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {/* Everyone sees Dashboard */}
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>

          {/* Replace “Well Detail” with All Wells (visible to admins & employees; optional for customers) */}
          {(isAdmin || isEmployee) && (
            <Link href="/admin/wells" className="hover:underline">All Wells</Link>
          )}
          {isCustomer && (
            <Link href="/wells" className="hover:underline">All Wells</Link> // or a customer-scoped list you add later
          )}

          {/* My Day only for staff */}
          {(isAdmin || isEmployee) && (
            <Link href="/driver/my-day" className="hover:underline">My Day</Link>
          )}

          {/* Account visible to any signed-in user */}
          {data?.user ? (
            <>
              <Link href="/account" className="hover:underline">Account</Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-xl border px-3 py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-xl border px-3 py-1">Client Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
