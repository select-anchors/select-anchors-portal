// app/admin/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminWellsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // ✅ ALWAYS define these inside the component
  const editApi = searchParams.get("api");
  const isEditing = searchParams.get("edit") === "1";

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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
          <div className="text-gray-600">
            Tip: You can jump to the full edit page:
            <span className="ml-2">
              <code className="px-1">/admin/wells/[api]/edit</code>
            </span>
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
                  <td className="p-3">
                    {w.last_test_date
                      ? new Date(w.last_test_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/wells/${encodeURIComponent(w.api)}`}
                        className="underline"
                      >
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
