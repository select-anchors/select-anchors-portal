"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function PendingWellsPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("changes"); // "changes" | "wells"
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === "admin";

  async function load() {
    setLoading(true);
    try {
      // Try the changes queue first
      let res = await fetch("/api/admin/changes", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setRows(j?.changes ?? []);
        setMode("changes");
      } else {
        // Fallback to pending wells listing
        res = await fetch("/api/wells?status=pending", { cache: "no-store" });
        const j = res.ok ? await res.json() : { wells: [] };
        setRows(j?.wells ?? []);
        setMode("wells");
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id, action) {
    if (mode !== "changes") return;
    const url = `/api/admin/changes/${id}/${action}`;
    await fetch(url, { method: "POST" });
    await load();
  }

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <div className="container py-10">Please log in.</div>;
  if (!isAdmin) return <div className="container py-10">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Submitted By</th>
              <th className="text-left p-3">{mode === "changes" ? "Diff" : "Lease/Well"}</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4" colSpan={5}>Nothing pending.</td></tr>
            ) : mode === "changes" ? (
              rows.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="p-3">{c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</td>
                  <td className="p-3 font-mono">{c.api}</td>
                  <td className="p-3">{c.submitted_by || "—"}</td>
                  <td className="p-3">
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(c.diff || {}, null, 2)}</pre>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2">
                      <button onClick={() => act(c.id, "approve")} className="px-3 py-1 rounded-xl border border-green-600 text-green-700">
                        Approve
                      </button>
                      <button onClick={() => act(c.id, "reject")} className="px-3 py-1 rounded-xl border border-red-600 text-red-700">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              rows.map((w) => (
                <tr key={w.api} className="border-t">
                  <td className="p-3">—</td>
                  <td className="p-3 font-mono">{w.api}</td>
                  <td className="p-3">{w.submitted_by || "—"}</td>
                  <td className="p-3">{w.lease_well_name || "—"}</td>
                  <td className="p-3">Approve/Reject from Changes page</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
