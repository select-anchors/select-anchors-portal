"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AdminChangesPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/changes", { cache: "no-store" });
      const j = await res.json();
      setRows(j?.changes ?? []);
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
    const url = `/api/admin/changes/${id}/${action}`;
    await fetch(url, { method: "POST" });
    await load();
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session) return <div className="p-8">Please log in.</div>;
  if (session.user.role !== "admin") return <div className="p-8">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Changes</h1>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Submitted By</th>
              <th className="text-left p-3">Diff</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4" colSpan={5}>No pending changes.</td></tr>
            ) : (
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
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => act(c.id, "approve")}
                        className="px-3 py-1 rounded-xl border border-green-600 text-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => act(c.id, "reject")}
                        className="px-3 py-1 rounded-xl border border-red-600 text-red-700"
                      >
                        Reject
                      </button>
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
