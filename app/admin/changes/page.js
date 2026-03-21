// app/admin/changes/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { hasPermission } from "../../../lib/permissions";

function prettyLabel(key) {
  const labels = {
    lease_well_name: "Lease / Well Name",
    company_name: "Company Name",
    company_email: "Company Email",
    company_phone: "Company Phone",
    company_address: "Company Address",
    company_man_name: "Company Man Name",
    company_man_email: "Company Man Email",
    company_man_phone: "Company Man Phone",
    previous_anchor_company: "Previous Anchor Company",
    previous_anchor_work: "Previous Anchor Work",
    directions_other_notes: "Directions / Other Notes",
    status: "Status",
    state: "State",
    county: "County",
    wellhead_coords: "Wellhead Coords",
    current_tested_at: "Last Test Date",
    current_expires_at: "Expiration Date",
    customer: "Customer",
    customer_id: "Customer ID",
  };

  return labels[key] || key;
}

export default function AdminChangesPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");

  const canApproveChanges = hasPermission(session, "can_approve_changes");

  async function load() {
    try {
      const res = await fetch("/api/admin/changes", { cache: "no-store" });
      const j = await res.json();
      setRows(Array.isArray(j?.changes) ? j.changes : []);
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

    if (status === "authenticated" && canApproveChanges) {
      loadSafe();
      intervalId = setInterval(loadSafe, 120000);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, canApproveChanges]);

  async function act(id, action) {
    try {
      setActingId(id);

      const res = await fetch(`/api/admin/changes/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(j?.error || `Failed to ${action} change`);
        return;
      }

      await load();
    } finally {
      setActingId("");
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!canApproveChanges) {
    return (
      <div className="container py-8">
        Not authorized. Please contact your Select Anchors admin if you believe this is an error.
      </div>
    );
  }

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
              <th className="text-left p-3">Requested Changes</th>
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
              rows.map((c) => {
                const payload = c.payload || {};
                const changes = payload.changes || {};
                const entries = Object.entries(changes);

                return (
                  <tr key={c.id} className="border-t align-top">
                    <td className="p-3">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                    </td>

                    <td className="p-3 font-mono">{payload.api || "—"}</td>

                    <td className="p-3">
                      <div>{payload.requested_by_name || c.submitted_by || "—"}</div>
                      {payload.requested_by_email ? (
                        <div className="text-xs text-gray-500">{payload.requested_by_email}</div>
                      ) : null}
                      {payload.requested_by_role ? (
                        <div className="text-xs text-gray-500 capitalize">{payload.requested_by_role}</div>
                      ) : null}
                    </td>

                    <td className="p-3">
                      {entries.length === 0 ? (
                        <div className="text-gray-500">No diff found.</div>
                      ) : (
                        <div className="space-y-2">
                          {entries.map(([key, value]) => (
                            <div key={key} className="rounded-lg border p-2 bg-gray-50">
                              <div className="text-xs font-semibold text-gray-700">
                                {prettyLabel(key)}
                              </div>
                              <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                                {value === null || value === "" ? "Blank / null" : String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => act(c.id, "approve")}
                          disabled={actingId === c.id}
                          className="px-3 py-1 rounded-xl border border-green-600 text-green-700 disabled:opacity-60"
                        >
                          {actingId === c.id ? "Working..." : "Approve"}
                        </button>

                        <button
                          onClick={() => act(c.id, "reject")}
                          disabled={actingId === c.id}
                          className="px-3 py-1 rounded-xl border border-red-600 text-red-700 disabled:opacity-60"
                        >
                          {actingId === c.id ? "Working..." : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
