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
          <div className="rounded-full bg-[#2f4f4f] text-white w-7 h-7 grid place-items-center text-sm font-bold">
            SA
          </div>
          <span className="font-semibold">SELECT ANCHORS</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {/* Everyone sees Dashboard */}
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>

          {/* All Wells */}
          {(isAdmin || isEmployee) && (
            <Link href="/admin/wells" className="hover:underline">
              All Wells
            </Link>
          )}
          {isCustomer && (
            <Link href="/wells" className="hover:underline">
              All Wells
            </Link>
          )}

          {/* My Day: staff only */}
          {(isAdmin || isEmployee) && (
            <Link href="/driver/my-day" className="hover:underline">
              My Day
            </Link>
          )}

          {/* Users (admin only) */}
          {isAdmin && (
            <Link href="/admin/users" className="hover:underline">
              Users
            </Link>
          )}

          {/* Account / Auth */}
          {data?.user ? (
            <>
              <Link href="/account" className="hover:underline">
                Account
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-xl border px-3 py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-xl border px-3 py-1">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
