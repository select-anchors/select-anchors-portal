// app/admin/changes/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminChangesPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
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
    let mounted = true;
    let intervalId;

    async function loadSafe() {
      if (!mounted) return;
      setLoading(true);
      await load();
    }

    if (status === "authenticated" && session?.user?.role === "admin") {
      // Initial load
      loadSafe();
      // Auto-refresh every 2 minutes
      intervalId = setInterval(loadSafe, 120000);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, session?.user?.role]);

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (session.user.role !== "admin")
    return (
      <div className="container py-8">
        Not authorized. Please contact your Select Anchors admin if you believe
        this is an error.
      </div>
    );

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pending Changes</h1>
        <p className="text-xs text-gray-500">
          This list refreshes automatically every 2 minutes.
        </p>
      </div>

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
              <tr>
                <td className="p-4" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  No pending changes.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="p-3">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleString()
                      : "—"}
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

  async function act(id, action) {
    const url = `/api/admin/changes/${id}/${action}`;
    await fetch(url, { method: "POST" });
    await load();
  }
}
