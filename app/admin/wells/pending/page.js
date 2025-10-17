"use client";

import { useEffect, useState } from "react";

export default function PendingWellsPage() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/wells?status=pending", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/wells/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          approved_by: "admin",        // TODO: replace with real user
          approved_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Approve failed");
      await load();
    } catch (e) {
      setMsg(e.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject(id) {
    setBusy(true);
    setMsg("");
    try {
      // Simple approach: delete. If you prefer "rejected", swap DELETE for PUT {status:'rejected'}
      const res = await fetch(`/api/wells/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (e) {
      setMsg(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-xl font-bold mb-2">Pending Wells</h1>
      <p className="text-sm text-gray-600 mb-4">
        New submissions waiting for approval.
      </p>

      {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr className="border-b">
              <th className="py-3 pl-5 pr-3">Company</th>
              <th className="py-3 pr-3">Lease/Well</th>
              <th className="py-3 pr-3">API</th>
              <th className="py-3 pr-3">Submitted</th>
              <th className="py-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="py-6 px-5 text-gray-500" colSpan={5}>
                  {busy ? "Loading…" : "No pending wells 🎉"}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-3 pl-5 pr-3">{r.company}</td>
                <td className="py-3 pr-3">{r.lease_well_name || "-"}</td>
                <td className="py-3 pr-3">{r.api}</td>
                <td className="py-3 pr-3">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="py-3 pr-5 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg bg-[#2f4f4f] text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg border border-gray-400 bg-white disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
