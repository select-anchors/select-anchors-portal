// app/components/Header.js
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { hasPermission } from "../../lib/permissions";

export default function Header() {
  const { data } = useSession();
  const isLoggedIn = !!data?.user;

  const canViewAllWells = hasPermission(data, "can_view_all_wells");
  const canUseDispatch = hasPermission(data, "can_use_dispatch");
  const canManageUsers = hasPermission(data, "can_manage_users");

  const wellsHref = canViewAllWells ? "/admin/wells" : "/wells";

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-full bg-[#2f4f4f] text-white w-8 h-8 grid place-items-center text-sm font-bold font-norwester">
            SA
          </div>
          <span className="font-norwester tracking-widest text-[15px]">
            SELECT ANCHORS
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {isLoggedIn && (
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          )}

          {isLoggedIn && (
            <Link href={wellsHref} className="hover:underline">
              All Wells
            </Link>
          )}

          {isLoggedIn && canUseDispatch && (
            <Link href="/driver/my-day" className="hover:underline">
              My Day
            </Link>
          )}

          {isLoggedIn && canManageUsers && (
            <Link href="/admin/users" className="hover:underline">
              Users
            </Link>
          )}

          {isLoggedIn ? (
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
