// app/admin/wells/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminWellsPage() {
  const { data: session, status } = useSession();
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const searchParams = useSearchParams();
  const editApi = searchParams.get("api");
  const isEditing = searchParams.get("edit") === "1";

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        let data = [];

        // Current API shape: plain array
        if (Array.isArray(json)) {
          data = json;
        }
        // Future-proof: if we ever return { wells: [...] }
        else if (Array.isArray(json?.wells)) {
          data = json.wells;
        }

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

  const filtered = q
    ? wells.filter(
        (w) =>
          (w.lease_well_name || "").toLowerCase().includes(q.toLowerCase()) ||
          (w.api || "").toLowerCase().includes(q.toLowerCase()) ||
          (w.company_name || "").toLowerCase().includes(q.toLowerCase())
      )
    : wells;

  const editingWell =
    isEditing && editApi
      ? wells.find((w) => w.api === editApi) ?? null
      : null;

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

      {/* Simple edit banner so the Edit link feels alive */}
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
              &mdash; Company:{" "}
              <span className="font-medium">
                {editingWell.company_name || "—"}
              </span>
            </div>
          ) : (
            <div className="text-gray-700">
              (This well is not currently in the loaded list.)
            </div>
          )}
          <div className="text-gray-600">
            You can wire a full edit form here later, or route to a dedicated
            <code className="px-1">/admin/wells/[api]/edit</code> page.
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <input
          placeholder="Search by API, Lease/Well Name, Company…"
          className="w-full"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
