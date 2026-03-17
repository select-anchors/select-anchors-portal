// app/dashboard/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../components/NotLoggedIn";
import WellsMap from "../components/WellsMap";
import { hasPermission } from "../../lib/permissions";

function daysUntil(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

function ExpirationPill({ expirationDate, windowDays = 90 }) {
  const d = daysUntil(expirationDate);

  if (d === null) {
    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-xs bg-gray-50 text-gray-600 border-gray-200">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        —
      </span>
    );
  }

  const isOverdue = d < 0;
  const isExpiringSoon = d <= windowDays;

  const dotClass = isOverdue ? "bg-red-600" : isExpiringSoon ? "bg-amber-500" : "bg-green-600";
  const wrapClass = isOverdue
    ? "bg-red-50 text-red-700 border-red-200"
    : isExpiringSoon
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-green-50 text-green-700 border-green-200";

  return (
    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-xs ${wrapClass}`}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {isOverdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
    </span>
  );
}

function StatCard({ title, value, loading, href }) {
  const content = (
    <div className="p-5 bg-white border rounded-2xl shadow-sm transition hover:shadow-md cursor-pointer">
      <div className="text-xs uppercase text-gray-500 tracking-wider">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{loading ? "—" : value}</div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
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

  const [visibleApis, setVisibleApis] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const canViewAllWells = hasPermission(session, "can_view_all_wells");
  const canManageUsers = hasPermission(session, "can_manage_users");
  const canApproveChanges = hasPermission(session, "can_approve_changes");
  const canManageItemsPricing = hasPermission(session, "can_manage_items_pricing");
  const canUseDispatch = hasPermission(session, "can_use_dispatch");

  const wellsPageHref = canViewAllWells ? "/admin/wells" : "/wells";

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const json = await res.json();
        if (isMounted) setStats(json);
      } catch {
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }

    run();
    return () => {
      isMounted = false;
    };
  }, [status]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();
        if (mounted) {
          const data = Array.isArray(json) ? json : Array.isArray(json?.wells) ? json.wells : [];
          setWells(data);
        }
      } catch {
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoadingWells(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [status]);

  const wellsWithStatus = useMemo(() => {
    return (wells || []).map((w) => {
      const exp =
        w.current_expires_at ??
        w.latest_expires_at ??
        w.expiration_date ??
        w.expiration ??
        null;

      return {
        ...w,
        _status: statusFromExpiration(exp, EXPIRING_WINDOW_DAYS),
        _days_left: daysUntil(exp),
        _exp_for_display: exp,
      };
    });
  }, [wells]);

  const checkboxFilteredWells = useMemo(() => {
    if (!showExpiring && !showExpired) return wellsWithStatus;

    return wellsWithStatus.filter((w) => {
      if (showExpiring && w._status === "expiring") return true;
      if (showExpired && w._status === "expired") return true;
      return false;
    });
  }, [wellsWithStatus, showExpiring, showExpired]);

  const searchedWells = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return checkboxFilteredWells;

    return checkboxFilteredWells.filter((w) => {
      const lease = (w.lease_well_name || "").toLowerCase();
      const api = (w.api || "").toLowerCase();
      const company = (w.company_name || "").toLowerCase();
      const companyMan = (w.company_man_name || "").toLowerCase();

      return (
        lease.includes(q) ||
        api.includes(q) ||
        company.includes(q) ||
        companyMan.includes(q)
      );
    });
  }, [checkboxFilteredWells, searchQuery]);

  const listWells = useMemo(() => {
    if (!Array.isArray(visibleApis) || visibleApis.length === 0) {
      return searchedWells;
    }

    const visibleSet = new Set(visibleApis);
    return searchedWells.filter((w) => visibleSet.has(w.api));
  }, [searchedWells, visibleApis]);

  const emptyFilterLabel = useMemo(() => {
    if (!showExpiring && !showExpired) return "No wells found.";
    if (showExpiring && showExpired) {
      return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days (or already expired).`;
    }
    if (showExpiring) return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days.`;
    return "No expired wells.";
  }, [showExpiring, showExpired]);

  const emptyListLabel = useMemo(() => {
    const q = searchQuery.trim();

    if (q && searchedWells.length === 0) return "No wells match your search.";
    if (q && searchedWells.length > 0 && listWells.length === 0) {
      return "No searched wells are in the current map view.";
    }
    if (!q && searchedWells.length > 0 && listWells.length === 0) {
      return "No wells in the current map view.";
    }

    return emptyFilterLabel;
  }, [searchQuery, searchedWells, listWells, emptyFilterLabel]);

  if (status === "loading") {
    return <div className="container py-10">Loading...</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Welcome, {session.user?.name || "User"}!</h1>

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
        <StatCard
          title="Total Wells"
          value={stats.wells}
          loading={loadingStats}
          href={wellsPageHref}
        />

        {canManageUsers && (
          <StatCard
            title="Users"
            value={stats.users}
            loading={loadingStats}
            href="/admin/users"
          />
        )}

        <StatCard
          title={`Upcoming Tests (≤${EXPIRING_WINDOW_DAYS}d)`}
          value={stats.upcomingTests}
          loading={loadingStats}
        />

        {canApproveChanges && (
          <StatCard
            title="Pending Changes"
            value={stats.pendingChanges}
            loading={loadingStats}
            href="/admin/changes"
          />
        )}
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <div className="font-semibold">Search</div>
            <div className="text-xs text-gray-500">
              Filters both the map and the wells list.
            </div>
          </div>

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by lease/well, API, company, company man…"
            className="w-full md:w-[420px] rounded-xl border px-3 py-2"
          />
        </div>
      </div>

      <>
        <WellsMap
          wells={searchedWells}
          expiringWindowDays={EXPIRING_WINDOW_DAYS}
          expiringOnly={showExpiring || showExpired}
          onVisibleWellsChange={setVisibleApis}
        />

        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Wells in View</div>
              <div className="text-xs text-gray-500">
                Showing {listWells.length} well{listWells.length === 1 ? "" : "s"} from the current map view.
              </div>
            </div>

            <Link href={wellsPageHref} className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50">
              Open Wells Page →
            </Link>
          </div>

          <div className="p-4">
            {loadingWells ? (
              <div className="text-sm text-gray-600">Loading wells…</div>
            ) : listWells.length === 0 ? (
              <div className="text-sm text-gray-600">{emptyListLabel}</div>
            ) : (
              <div className="space-y-3">
                {listWells.map((w) => (
                  <div
                    key={w.api || `${w.lease_well_name}-x`}
                    className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <Link href={`/wells/${encodeURIComponent(w.api || "")}`} className="font-semibold underline">
                        {w.lease_well_name || "—"}
                      </Link>

                      <div className="text-xs text-gray-600">
                        API: <span className="font-mono">{w.api || "—"}</span>
                      </div>

                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2">
                        <span>
                          Last test: {w.last_test_date || "—"} • Expires: {w._exp_for_display || "—"}
                        </span>
                        <ExpirationPill
                          expirationDate={w._exp_for_display}
                          windowDays={EXPIRING_WINDOW_DAYS}
                        />
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
      </>

      {(canManageUsers || canApproveChanges || canManageItemsPricing) && (
        <div className="grid md:grid-cols-3 gap-6">
          {canManageUsers && (
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
          )}

          {canApproveChanges && (
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
          )}

          {canManageItemsPricing && (
            <Link
              href="/admin/items"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">Items & Pricing</h2>
              <p className="text-sm text-gray-600">
                Manage service types, charges, and billing rates.
              </p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
