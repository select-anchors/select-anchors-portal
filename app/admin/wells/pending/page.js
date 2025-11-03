"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function PendingWellsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [mode, setMode] = useState("changes"); // "changes" | "wells"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const columns = useMemo(() => {
    if (mode === "changes") {
      return ["When", "API", "Submitted By", "Diff", "Action"];
    }
    return ["When", "API", "Submitted By", "Lease/Well", "Action"];
  }, [mode]);

  async function load(preferredMode = "changes") {
    setLoading(true);
    setErr("");
    try {
      if (preferredMode === "changes") {
        // Try the admin changes queue first
        const res = await fetch("/api/admin/changes", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          setRows(j?.changes ?? []);
          setMode("changes");
          setLoading(false);
          return;
        }
        // fall through to wells pending if endpoint missing or 4xx/5xx
      }

      // Fallback: pending wells list
      const res2 = await fetch("/api/wells?status=pending", { cache: "no-store" });
      if (res2.ok) {
        const j2 = await res2.json();
        setRows(j2?.wells ?? []);
        setMode("wells");
        setLoading(false);
        return;
      }

      throw new Error("Neither pending changes nor pending wells could be loaded.");
    } catch (e) {
      setErr(e?.message || "Failed to load pending items.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load prefers "changes"
    load("changes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id, action) {
    if (mode !== "changes") return;
    try {
      setLoading(true);
      setErr("");
      const url = `/api/admin/changes/${id}/${action}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to ${action} change ${id}`);
      await load("changes");
    } catch (e) {
      setErr(e?.message || "Action failed.");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <div className="container py-10 text-gray-600">Checking your access…</div>;
  }
  if (!session) {
    return (
      <div className="container py-10">
        <p className="mb-4">Please log in.</p>
        <a href="/login" className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50">
          Go to login
        </a>
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="container py-10">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={mode}
            onChange={(e) => {
              // manual switch triggers reload preferring that mode
              load(e.target.value);
            }}
          >
            <option value="changes">Changes Queue</option>
            <option value="wells">Pending Wells</option>
          </select>
          <button
            onClick={() => load(mode)}
            className="px-3 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white border rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left p-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={columns.length}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={columns.length}>
                  Nothing pending.
                </td>
              </tr>
            ) : mode === "changes" ? (
              rows.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="p-3">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 font-mono">{c.api}</td>
                  <td className="p-3">{c.submitted_by || "—"}</td>
                  <td className="p-3">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(c.diff || {}, null, 2)}
                    </pre>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => act(c.id, "approve")}
                        className="px-3 py-1 rounded-xl border border-green-600 text-green-700 hover:bg-green-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => act(c.id, "reject")}
                        className="px-3 py-1 rounded-xl border border-red-600 text-red-700 hover:bg-red-50"
                      >
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
                  <td className="p-3 text-gray-500">Approve/Reject from Changes page</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
