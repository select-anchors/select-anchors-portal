// app/admin/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import NotLoggedIn from "../../components/NotLoggedIn";

// --- status helpers (computed from expiration_date) ---
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

function StatusPill({ status, daysLeft }) {
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
    s === "expired" ? "Expired" : s === "expiring" ? "Expiring Soon" : s === "good" ? "Good" : "Unknown";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full border ${cls}`}>
      {label}
      {typeof daysLeft === "number" ? (
        <span className="ml-2 opacity-70">
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d past due` : `${daysLeft}d left`}
        </span>
      ) : null}
    </span>
  );
}

export default function AdminWellsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const editApi = searchParams.get("api");
  const isEditing = searchParams.get("edit") === "1";

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const EXPIRING_WINDOW_DAYS = 90;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        let data = [];
        if (Array.isArray(json)) data = json;
        else if (Array.isArray(json?.wells)) data = json.wells;

        setWells(data);
      } catch (err) {
        console.error("Error loading wells (admin page):", err);
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  const role = session?.user?.role;
  const canSee = role === "admin" || role === "employee";
  if (!canSee) return <div className="container py-8">Not authorized.</div>;

  const wellsWithStatus = useMemo(() => {
    return (wells || []).map((w) => {
      const exp = w.expiration_date || null; // comes from API (current_expires_at formatted)
      const st = statusFromExpiration(exp, EXPIRING_WINDOW_DAYS);
      return { ...w, _status: st, _days_left: daysUntil(exp) };
    });
  }, [wells]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wellsWithStatus;

    return wellsWithStatus.filter((w) => {
      const lease = (w.lease_well_name || "").toLowerCase();
      const api = (w.api || "").toLowerCase();
      const company = (w.company_name || "").toLowerCase();
      const companyMan = (w.company_man_name || "").toLowerCase();
      return lease.includes(q) || api.includes(q) || company.includes(q) || companyMan.includes(q);
    });
  }, [query, wellsWithStatus]);

  const editingWell = isEditing && editApi ? wells.find((w) => w.api === editApi) ?? null : null;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Wells</h1>
        <Link
          href="/admin/wells/new"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New Well
        </Link>
      </div>

      {isEditing && editApi && (
        <div className="p-4 rounded-xl border bg-yellow-50 text-sm space-y-1">
          <div className="font-semibold">
            Editing well with API: <span className="font-mono">{editApi}</span>
          </div>
          {editingWell ? (
            <div className="text-gray-700">
              Lease/Well: <span className="font-medium">{editingWell.lease_well_name || "—"}</span> — Company:{" "}
              <span className="font-medium">{editingWell.company_name || "—"}</span>
            </div>
          ) : (
            <div className="text-gray-700">(This well is not in the loaded list.)</div>
          )}
          <div className="text-gray-600">
            Tip: You can jump to the full edit page: <code className="px-1">/admin/wells/[api]/edit</code>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <input
          placeholder="Search by API, Lease/Well Name, Company, Company Man…"
          className="w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Lease/Well</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Company Man</th>
              <th className="text-left p-3">Last Test</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={7}>
                  No wells found.
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.api} className="border-t">
                  <td className="p-3">{w.lease_well_name || "—"}</td>
                  <td className="p-3 font-mono">{w.api}</td>
                  <td className="p-3">{w.company_name || "—"}</td>
                  <td className="p-3">{w.company_man_name || "—"}</td>
                  <td className="p-3">{w.last_test_date ? new Date(w.last_test_date).toLocaleDateString() : "—"}</td>
                  <td className="p-3">
                    <StatusPill status={w._status} daysLeft={w._days_left} />
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
