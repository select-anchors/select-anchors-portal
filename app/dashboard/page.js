"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="p-10">Loading...</div>;
  if (!session) return <div className="p-10">Please log in.</div>;

  const role = session?.user?.role || "customer";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {session.user.name || "User"}!</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card: My Day */}
        {(isAdmin || isEmployee) && (
          <Link
            href="/driver/my-day"
            className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
          >
            <h2 className="text-xl font-semibold mb-2">My Day</h2>
            <p className="text-sm text-gray-600">
              View and update today’s job details, routes, and well site work.
            </p>
          </Link>
        )}

        {/* Card: Wells */}
        <Link
          href={isAdmin || isEmployee ? "/admin/wells" : "/wells"}
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">All Wells</h2>
          <p className="text-sm text-gray-600">
            View or update well data, anchor test results, and recent site updates.
          </p>
        </Link>

        {/* Card: Account */}
        <Link
          href="/account"
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">Account</h2>
          <p className="text-sm text-gray-600">
            Manage your login info, password, and notification preferences.
          </p>
        </Link>

        {/* Admin-only cards */}
        {isAdmin && (
          <>
            <Link
              href="/admin/users"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">Manage Users</h2>
              <p className="text-sm text-gray-600">
                Create, edit, and reset passwords for employees and clients.
              </p>
            </Link>

            <Link
              href="/admin/items"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">Items & Pricing</h2>
              <p className="text-sm text-gray-600">
                Manage anchor service types, test charges, and billing rates.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
