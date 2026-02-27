// /app/dashboard/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";
import WellsMap from "../components/WellsMap";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function StatusPill({ status }) {
  const s = status || "unknown";
  const cls =
    s === "expired"
      ? "bg-red-50 text-red-700 border-red-200"
      : s === "expiring"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : s === "good"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-600 border-gray-200";

  const label =
    s === "expired"
      ? "Expired"
      : s === "expiring"
      ? "Expiring Soon"
      : s === "good"
      ? "Good"
      : "Unknown";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

const CountBadge = ({ value, loading }) => (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 border">
    {loading ? "…" : value}
  </span>
);

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const EXPIRING_WINDOW_DAYS = 90;

  const [stats, setStats] = useState({
    wells: 0,
    users: 0,
    pendingChanges: 0,
    upcomingTests: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [wells, setWells] = useState([]);
  const [loadingWells, setLoadingWells] = useState(true);

  const [showExpiring, setShowExpiring] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  // Fetch stats
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
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch wells
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();
        if (mounted) setWells(Array.isArray(json) ? json : []);
      } catch {
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoadingWells(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---- IMPORTANT: ALL MEMOS ABOVE ANY RETURN ----
  const role = session?.user?.role || "customer";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";

  // NOTE: you’re using expiration_date in wells list; keep consistent.
  const wellsWithStatus = useMemo(() => {
    return (wells || []).map((w) => {
      const exp = w.current_expires_at ?? w.expiration_date ?? null;
      return {
        ...w,
        _status: statusFromExpiration(exp, EXPIRING_WINDOW_DAYS),
        _days_left: daysUntil(exp),
        _exp_for_display: exp,
      };
    });
  }, [wells, EXPIRING_WINDOW_DAYS]);

  const filteredWells = useMemo(() => {
    if (!showExpiring && !showExpired) return wellsWithStatus;

    return wellsWithStatus.filter((w) => {
      if (showExpiring && w._status === "expiring") return true;
      if (showExpired && w._status === "expired") return true;
      return false;
    });
  }, [wellsWithStatus, showExpiring, showExpired]);

  const emptyFilterLabel = useMemo(() => {
    if (!showExpiring && !showExpired) return "No wells found.";
    if (showExpiring && showExpired)
      return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days (or already expired).`;
    if (showExpiring) return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days.`;
    return "No expired wells.";
  }, [showExpiring, showExpired, EXPIRING_WINDOW_DAYS]);

  // ---- NOW it’s safe to return conditionally ----
  if (status === "loading") {
    return <div className="container py-10">Loading...</div>;
  }
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">
          Welcome, {session.user?.name || "User"}!
        </h1>

        <div className="flex gap-3 text-sm bg-white border rounded-2xl px-4 py-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showExpiring}
              onChange={(e) => setShowExpiring(e.target.checked)}
            />
            <span>Expiring Soon (≤{EXPIRING_WINDOW_DAYS}d)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            <span>Expired</span>
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Total Wells</div>
          <div className="mt-1 text-2xl font-semibold">{loadingStats ? "—" : stats.wells}</div>
        </div>

        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">Users</div>
          <div className="mt-1 text-2xl font-semibold">{loadingStats ? "—" : stats.users}</div>
        </div>

        <div className="p-5 bg-white border rounded-2xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wider">
            Upcoming Tests (≤{EXPIRING_WINDOW_DAYS}d)
          </div>
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

      {(isCustomer || isAdmin || isEmployee) && (
        <div className="space-y-4">
          <WellsMap
            wells={filteredWells}
            expiringWindowDays={EXPIRING_WINDOW_DAYS}
            expiringOnly={showExpiring || showExpired}
          />

          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">My Wells</div>
                <div className="text-xs text-gray-500">
                  Click a well to view details, or request a test in one click.
                </div>
              </div>
              <Link
                href="/wells"
                className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
              >
                Open Wells Page →
              </Link>
            </div>

            <div className="p-4">
              {loadingWells ? (
                <div className="text-sm text-gray-600">Loading wells…</div>
              ) : filteredWells.length === 0 ? (
                <div className="text-sm text-gray-600">{emptyFilterLabel}</div>
              ) : (
                <div className="space-y-3">
                  {filteredWells.map((w) => (
                    <div
                      key={w.api || `${w.lease_well_name}-${Math.random()}`}
                      className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold">{w.lease_well_name || "—"}</div>
                        <div className="text-xs text-gray-600">
                          API: <span className="font-mono">{w.api || "—"}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Last test: {w.last_test_date || "—"} • Expires: {w._exp_for_display || "—"}
                          {typeof w._days_left === "number" ? (
                            <span className="ml-2 text-gray-500">
                              ({w._days_left < 0
                                ? `${Math.abs(w._days_left)}d past due`
                                : `${w._days_left}d left`}
                              )
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1">
                          <StatusPill status={w._status} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/wells/${encodeURIComponent(w.api || "")}`}
                          className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                        >
                          View
                        </Link>

                        <Link
                          href={`/jobs/new?api=${encodeURIComponent(w.api || "")}&lease_well_name=${encodeURIComponent(
                            w.lease_well_name || ""
                          )}&company_name=${encodeURIComponent(w.company_name || "")}`}
                          className="px-3 py-2 rounded-xl bg-[#2f4f4f] text-white text-sm hover:opacity-90"
                        >
                          Request Test
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
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

        <Link
          href={isAdmin || isEmployee ? "/admin/wells" : "/wells"}
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">
            All Wells
            <CountBadge value={stats.wells} loading={loadingStats} />
          </h2>
          <p className="text-sm text-gray-600">
            View well data, anchor test results, and expiration dates.
          </p>
        </Link>

        <Link
          href="/account"
          className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">Account</h2>
          <p className="text-sm text-gray-600">
            Manage your login info and notification preferences.
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
                Manage service types, charges, and billing rates.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
