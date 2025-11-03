"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    wells: 0,
    users: 0,
    pendingChanges: 0,
    upcomingTests: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const json = await res.json();
        if (isMounted) setStats(json);
      } catch {
        // leave defaults
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (status === "loading") return <div className="p-10">Loading...</div>;
  if (!session) return <div className="p-10">Please log in.</div>;

  const role = session?.user?.role || "customer";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";

  const CountBadge = ({ value, loading }) => (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 border">
      {loading ? "…" : value}
    </span>
  );

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-3xl font-bold">
        Welcome, {session.user.name || "User"}!
      </h1>

      {/* Quick metrics row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Total Wells</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingStats ? "—" : stats.wells}
          </div>
        </div>
        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Users</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingStats ? "—" : stats.users}
          </div>
        </div>
        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Upcoming Tests (≤30d)</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingStats ? "—" : stats.upcomingTests}
          </div>
        </div>
        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Pending Changes</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingStats ? "—" : stats.pendingChanges}
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {(isAdmin || isEmployee) && (
          <Link
            href="/driver/my-day"
            className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
          >
            <h2 className="text-xl font-semibold mb-2">
              My Day
            </h2>
            <p className="text-sm text-gray-600">
              View and update today’s job details, routes, and well site work.
            </p>
          </Link>
        )}

        <Link
          href={isAdmin || isEmployee ? "/admin/wells" : "/wells"}
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">
            All Wells
            <CountBadge value={stats.wells} loading={loadingStats} />
          </h2>
          <p className="text-sm text-gray-600">
            View or update well data, anchor test results, and recent site updates.
          </p>
        </Link>

        <Link
          href="/account"
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">Account</h2>
          <p className="text-sm text-gray-600">
            Manage your login info, password, and notification preferences.
          </p>
        </Link>

        {isAdmin && (
          <>
            <Link
              href="/admin/users"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">
                Manage Users
                <CountBadge value={stats.users} loading={loadingStats} />
              </h2>
              <p className="text-sm text-gray-600">
                Create, edit, and reset passwords for employees and clients.
              </p>
            </Link>

            <Link
              href="/admin/changes"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">
                Pending Changes
                <CountBadge value={stats.pendingChanges} loading={loadingStats} />
              </h2>
              <p className="text-sm text-gray-600">
                Review and approve edits before they go live.
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
