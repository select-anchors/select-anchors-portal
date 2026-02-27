// app/admin/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function fmtDate(d) {
  if (!d) return "—";
  // handle "YYYY-MM-DD" as local date (prevents timezone shift)
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString();
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}
function SortableTh({ label, column }) {
  const active = sortKey === column;
  const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "";

  return (
    <th
      className="text-left p-3 cursor-pointer select-none hover:bg-gray-100"
      onClick={() => {
        if (active) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
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
export default function AdminWellsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // URL flags (optional)
  const editApi = searchParams.get("api");
  const isEditing = searchParams.get("edit") === "1";

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  let list = wells;

  if (q) {
    list = list.filter((w) => {
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
  }

  const dir = sortDir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let av = a?.[sortKey];
    let bv = b?.[sortKey];

    // Date sorting
    if (sortKey === "last_test_date" || sortKey === "expiration_date") {
      const ad = av ? new Date(av).getTime() : 0;
      const bd = bv ? new Date(bv).getTime() : 0;
      return (ad - bd) * dir;
    }

    // String sorting
    av = (av ?? "").toString().toLowerCase();
    bv = (bv ?? "").toString().toLowerCase();

    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}, [wells, query, sortKey, sortDir]);
  
  const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  let list = wells;

  if (q) {
    list = list.filter((w) => {
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
  }

  const dir = sortDir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let av = a?.[sortKey];
    let bv = b?.[sortKey];

    // Date sorting
    if (sortKey === "last_test_date" || sortKey === "expiration_date") {
      const ad = av ? new Date(av).getTime() : 0;
      const bd = bv ? new Date(bv).getTime() : 0;
      return (ad - bd) * dir;
    }

    // String sorting
    av = (av ?? "").toString().toLowerCase();
    bv = (bv ?? "").toString().toLowerCase();

    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}, [wells, query, sortKey, sortDir]);
  
  const role = session?.user?.role;
  const canSee = role === "admin" || role === "employee";

  // ✅ Only fetch after auth is resolved AND user is allowed
  useEffect(() => {
    let mounted = true;

    async function load() {
      // Wait until NextAuth resolves
      if (status !== "authenticated") return;

      // If not allowed, do not fetch
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

        // Handle non-OK responses cleanly
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load wells (HTTP ${res.status})`);
        }

        const json = await res.json();

        if (!mounted) return;

        let data = [];
        if (Array.isArray(json)) data = json;
        else if (Array.isArray(json?.wells)) data = json.wells;

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

  // ✅ Hooks before returns
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wells;

    return wells.filter((w) => {
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
  }, [query, wells]);

  const editingWell =
    isEditing && editApi ? wells.find((w) => w.api === editApi) ?? null : null;

  // ✅ Returns after hooks
  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!canSee) return <div className="container py-8">Not authorized.</div>;

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
              Lease/Well:{" "}
              <span className="font-medium">
                {editingWell.lease_well_name || "—"}
              </span>{" "}
              — Company:{" "}
              <span className="font-medium">
                {editingWell.company_name || "—"}
              </span>
            </div>
          ) : (
            <div className="text-gray-700">(This well is not in the loaded list.)</div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          placeholder="Search by API, Lease/Well Name, Company, Company Man…"
          className="w-full rounded-xl border px-3 py-2"
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
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={6}>
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
                  <td className="p-3">{fmtDate(w.last_test_date)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/wells/${encodeURIComponent(w.api)}`} className="underline">
                        View
                      </Link>
                      <Link
                        href={`/admin/wells/${encodeURIComponent(w.api)}/edit`}
                        className="underline"
                      >
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
