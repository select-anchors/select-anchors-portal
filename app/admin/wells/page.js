"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function AdminWellsPage() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState("");

  // Load all wells (admin sees everything)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/wells", {
          // TEMP role until auth is wired
          headers: { "x-role": "admin" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load wells (${res.status})`);
        const data = await res.json();
        if (!cancel) setWells(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setError(String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const pending = useMemo(() => wells.filter(w => !w.is_approved), [wells]);
  const approved = useMemo(() => wells.filter(w => w.is_approved), [wells]);

  async function approveWell(id) {
    try {
      setApprovingId(id);
      const res = await fetch("/api/wells", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-role": "admin",
        },
        body: JSON.stringify({ id, approve: true }),
      });
      if (!res.ok) throw new Error(`Approve failed (${res.status})`);
      const updated = await res.json();
      // Optimistically update UI
      setWells(prev =>
        prev.map(w => (w.id === id ? { ...w, ...updated } : w))
      );
    } catch (e) {
      alert(String(e));
    } finally {
      setApprovingId(null);
    }
  }

  function Row({ w }) {
    return (
      <tr className="border-b last:border-0">
        <td className="py-3 pl-5 pr-4 font-medium">
          {w.company_name || "—"}
          <div className="text-xs text-gray-500">
            {w.customer_id ? `Customer ID: ${w.customer_id}` : ""}
          </div>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap">{w.api || "—"}</td>
        <td className="py-3 pr-4">{w.company_phone || "—"}</td>
        <td className="py-3 pr-4">{w.company_man_name || "—"}</td>
        <td className="py-3 pr-4 whitespace-nowrap">
          {w.last_test_date ? new Date(w.last_test_date).toLocaleDateString() : "—"}
        </td>
        <td className="py-3 pr-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {/* View Well Detail (uses your existing dynamic route by API if present) */}
            {w.api ? (
              <Link
                href={`/wells/${encodeURIComponent(w.api)}`}
                className="px-3 py-1.5 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
              >
                View
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-400">
                No API
              </span>
            )}

            {/* (Optional) placeholder Edit link — wire up later */}
            <Link
              href={`/admin/wells?edit=${encodeURIComponent(w.id)}`}
              className="px-3 py-1.5 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Edit
            </Link>

            {/* Approve button (only if not approved yet) */}
            {!w.is_approved ? (
              <button
                onClick={() => approveWell(w.id)}
                disabled={approvingId === w.id}
                className="px-3 py-1.5 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
                title="Approve this well"
              >
                {approvingId === w.id ? "Approving..." : "Approve"}
              </button>
            ) : (
              <span className="inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500 text-white">
                Approved
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin · Wells</h1>
          <p className="text-sm text-gray-600">
            Approve new wells, review details, and (later) edit entries.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Placeholder "New Well" page you can add later */}
          <Link
            href="/admin/wells/new"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            New Well
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {/* Pending approvals */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 pt-4 pb-2 border-b">
          <h2 className="font-semibold">Pending Approval ({pending.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No pending wells.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-3 pl-5 pr-4">Company</th>
                <th className="py-3 pr-4">API</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Company Man</th>
                <th className="py-3 pr-4">Last Test</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>{pending.map(w => <Row key={w.id} w={w} />)}</tbody>
          </table>
        )}
      </section>

      {/* Approved list */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 pt-4 pb-2 border-b">
          <h2 className="font-semibold">Approved Wells ({approved.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : approved.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No approved wells yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-3 pl-5 pr-4">Company</th>
                <th className="py-3 pr-4">API</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Company Man</th>
                <th className="py-3 pr-4">Last Test</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>{approved.map(w => <Row key={w.id} w={w} />)}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
