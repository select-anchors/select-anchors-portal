// app/admin/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";

function fmtDate(d) {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString();
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

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

function bestExpiration(w) {
  return (
    w?.current_expires_at ??
    w?.latest_expires_at ??
    w?.expiration_date ??
    w?.expiration ??
    null
  );
}

function bestLastTest(w) {
  return w?.current_tested_at ?? w?.last_test_date ?? null;
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
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

function matchesDateRange(value, from, to) {
  if (!value && !from && !to) return true;
  if (!value) return false;

  const raw = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  if (!raw) {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return false;
    const iso = dt.toISOString().slice(0, 10);
    if (from && iso < from) return false;
    if (to && iso > to) return false;
    return true;
  }

  if (from && raw < from) return false;
  if (to && raw > to) return false;
  return true;
}

export default function AdminWellsPage() {
  const { data: session, status } = useSession();

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyManFilter, setCompanyManFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusWindow, setStatusWindow] = useState("90");

  const [lastTestFrom, setLastTestFrom] = useState("");
  const [lastTestTo, setLastTestTo] = useState("");
  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");

  const [sortKey, setSortKey] = useState("lease_well_name");
  const [sortDir, setSortDir] = useState("asc");

  const role = session?.user?.role;
  const canSee = role === "admin" || role === "employee";

  function SortableTh({ label, column }) {
    const active = sortKey === column;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "";

    return (
      <th
        className="text-left p-3 cursor-pointer select-none hover:bg-gray-100"
        onClick={() => {
          if (active) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(column);
            setSortDir("asc");
          }
        }}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="text-xs">{arrow}</span>
        </span>
      </th>
    );
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (status === "loading") return;

      if (status !== "authenticated") {
        if (mounted) setLoading(false);
        return;
      }

      if (!canSee) {
        if (mounted) {
          setWells([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        const res = await fetch("/api/wells", { cache: "no-store" });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load wells (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (!mounted) return;

        const data = Array.isArray(json) ? json : Array.isArray(json?.wells) ? json.wells : [];
        setWells(data);
      } catch (err) {
        console.error("Error loading wells (admin page):", err);
        if (mounted) {
          setWells([]);
          setError(err?.message || "Failed to load wells.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [status, canSee]);

  const companyOptions = useMemo(() => {
    return [...new Set((wells || []).map((w) => (w.company_name || "").trim()).filter(Boolean))].sort();
  }, [wells]);

  const companyManOptions = useMemo(() => {
    return [...new Set((wells || []).map((w) => (w.company_man_name || "").trim()).filter(Boolean))].sort();
  }, [wells]);

  const countyOptions = useMemo(() => {
    return [...new Set((wells || []).map((w) => (w.county || "").trim()).filter(Boolean))].sort();
  }, [wells]);

  const stateOptions = useMemo(() => {
    return [...new Set((wells || []).map((w) => (w.state || "").trim()).filter(Boolean))].sort();
  }, [wells]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const windowDays = Number(statusWindow) || 90;

    let list = (wells || []).map((w) => {
      const exp = bestExpiration(w);
      const lastTest = bestLastTest(w);
      return {
        ...w,
        _exp_for_display: exp,
        _last_test_for_display: lastTest,
        _status: statusFromExpiration(exp, windowDays),
      };
    });

    if (q) {
      list = list.filter((w) => {
        const lease = (w.lease_well_name || "").toLowerCase();
        const api = (w.api || "").toLowerCase();
        const company = (w.company_name || "").toLowerCase();
        const companyMan = (w.company_man_name || "").toLowerCase();
        const county = (w.county || "").toLowerCase();
        const state = (w.state || "").toLowerCase();

        return (
          lease.includes(q) ||
          api.includes(q) ||
          company.includes(q) ||
          companyMan.includes(q) ||
          county.includes(q) ||
          state.includes(q)
        );
      });
    }

    if (companyFilter) {
      list = list.filter((w) => (w.company_name || "") === companyFilter);
    }

    if (companyManFilter) {
      list = list.filter((w) => (w.company_man_name || "") === companyManFilter);
    }

    if (countyFilter) {
      list = list.filter((w) => (w.county || "") === countyFilter);
    }

    if (stateFilter) {
      list = list.filter((w) => (w.state || "") === stateFilter);
    }

    if (statusFilter) {
      list = list.filter((w) => w._status === statusFilter);
    }

    if (lastTestFrom || lastTestTo) {
      list = list.filter((w) =>
        matchesDateRange(w._last_test_for_display, lastTestFrom, lastTestTo)
      );
    }

    if (expFrom || expTo) {
      list = list.filter((w) =>
        matchesDateRange(w._exp_for_display, expFrom, expTo)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...list].sort((a, b) => {
      const aExp = a._exp_for_display;
      const bExp = b._exp_for_display;
      const aLast = a._last_test_for_display;
      const bLast = b._last_test_for_display;

      if (sortKey === "expires_in") {
        const ad = daysUntil(aExp);
        const bd = daysUntil(bExp);
        const av = ad === null ? Number.POSITIVE_INFINITY : ad;
        const bv = bd === null ? Number.POSITIVE_INFINITY : bd;
        return (av - bv) * dir;
      }

      if (sortKey === "expiration_date") {
        const ad = aExp ? new Date(aExp).getTime() : 0;
        const bd = bExp ? new Date(bExp).getTime() : 0;
        return (ad - bd) * dir;
      }

      if (sortKey === "last_test_date") {
        const ad = aLast ? new Date(aLast).getTime() : 0;
        const bd = bLast ? new Date(bLast).getTime() : 0;
        return (ad - bd) * dir;
      }

      let av = a?.[sortKey];
      let bv = b?.[sortKey];

      av = (av ?? "").toString().toLowerCase();
      bv = (bv ?? "").toString().toLowerCase();

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [
    wells,
    query,
    companyFilter,
    companyManFilter,
    countyFilter,
    stateFilter,
    statusFilter,
    statusWindow,
    lastTestFrom,
    lastTestTo,
    expFrom,
    expTo,
    sortKey,
    sortDir,
  ]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (companyFilter) params.set("company", companyFilter);
    if (companyManFilter) params.set("company_man", companyManFilter);
    if (countyFilter) params.set("county", countyFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (statusWindow) params.set("status_window", statusWindow);
    if (lastTestFrom) params.set("last_test_from", lastTestFrom);
    if (lastTestTo) params.set("last_test_to", lastTestTo);
    if (expFrom) params.set("exp_from", expFrom);
    if (expTo) params.set("exp_to", expTo);

    const qs = params.toString();
    return `/api/wells/export${qs ? `?${qs}` : ""}`;
  }, [
    query,
    companyFilter,
    companyManFilter,
    countyFilter,
    stateFilter,
    statusFilter,
    statusWindow,
    lastTestFrom,
    lastTestTo,
    expFrom,
    expTo,
  ]);

  function clearFilters() {
    setQuery("");
    setCompanyFilter("");
    setCompanyManFilter("");
    setCountyFilter("");
    setStateFilter("");
    setStatusFilter("");
    setStatusWindow("90");
    setLastTestFrom("");
    setLastTestTo("");
    setExpFrom("");
    setExpTo("");
  }

  function applyPreset(type) {
    clearFilters();

    if (type === "expired") {
      setStatusFilter("expired");
      return;
    }

    if (type === "expiring30") {
      setStatusFilter("expiring");
      setStatusWindow("30");
      return;
    }

    if (type === "expiring90") {
      setStatusFilter("expiring");
      setStatusWindow("90");
      return;
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!canSee) return <div className="container py-8">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">All Wells</h1>

        <div className="flex gap-2 flex-wrap">
          <a
            href={exportHref}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Export CSV
          </a>

          <Link
            href="/admin/wells/new"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            New Well
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-2xl p-4 space-y-4">
        <div className="font-semibold">Quick Reports</div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => clearFilters()}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            All Wells
          </button>

          <button
            onClick={() => applyPreset("expired")}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            Expired
          </button>

          <button
            onClick={() => applyPreset("expiring30")}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            Expiring ≤30d
          </button>

          <button
            onClick={() => applyPreset("expiring90")}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            Expiring ≤90d
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 space-y-4">
        <div className="font-semibold">Filters</div>

        <div className="grid md:grid-cols-3 gap-3">
          <input
            placeholder="Search by API, lease/well, company, company man, county, state…"
            className="w-full rounded-xl border px-3 py-2 md:col-span-3"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="">All Companies</option>
            {companyOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={companyManFilter}
            onChange={(e) => setCompanyManFilter(e.target.value)}
          >
            <option value="">All Company Men</option>
            {companyManOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="good">Good</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
          >
            <option value="">All Counties</option>
            {countyOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All States</option>
            {stateOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-full rounded-xl border px-3 py-2"
            value={statusWindow}
            onChange={(e) => setStatusWindow(e.target.value)}
          >
            <option value="30">Expiring window: 30 days</option>
            <option value="60">Expiring window: 60 days</option>
            <option value="90">Expiring window: 90 days</option>
            <option value="180">Expiring window: 180 days</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm font-medium">Last Test Date Range</div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={lastTestFrom}
                onChange={(e) => setLastTestFrom(e.target.value)}
              />
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={lastTestTo}
                onChange={(e) => setLastTestTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Expiration Date Range</div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={expFrom}
                onChange={(e) => setExpFrom(e.target.value)}
              />
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={expTo}
                onChange={(e) => setExpTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            Clear Filters
          </button>

          <a
            href={exportHref}
            className="px-3 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm"
          >
            Export Current Results
          </a>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{filtered.length}</span> of{" "}
        <span className="font-semibold">{wells.length}</span> wells
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <SortableTh label="Lease / Well" column="lease_well_name" />
              <SortableTh label="API" column="api" />
              <SortableTh label="Company" column="company_name" />
              <SortableTh label="Company Man" column="company_man_name" />
              <SortableTh label="County" column="county" />
              <SortableTh label="State" column="state" />
              <SortableTh label="Last Test" column="last_test_date" />
              <SortableTh label="Expiration" column="expiration_date" />
              <SortableTh label="Expires In" column="expires_in" />
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={10}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={10}>No wells found.</td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.api} className="border-t">
                  <td className="p-3">{w.lease_well_name || "—"}</td>
                  <td className="p-3 font-mono">{w.api}</td>
                  <td className="p-3">{w.company_name || "—"}</td>
                  <td className="p-3">{w.company_man_name || "—"}</td>
                  <td className="p-3">{w.county || "—"}</td>
                  <td className="p-3">{w.state || "—"}</td>
                  <td className="p-3">{fmtDate(w._last_test_for_display)}</td>
                  <td className="p-3">{fmtDate(w._exp_for_display)}</td>
                  <td className="p-3">
                    <ExpirationPill expirationDate={w._exp_for_display} windowDays={Number(statusWindow) || 90} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/wells/${encodeURIComponent(w.api)}`} className="underline">
                        View
                      </Link>
                      <Link href={`/admin/wells/${encodeURIComponent(w.api)}/edit`} className="underline">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
