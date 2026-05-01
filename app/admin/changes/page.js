// app/admin/changes/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { hasPermission } from "../../../lib/permissions";

function prettyLabel(key) {
  const labels = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    role: "Role",
    permissions_json: "Permissions",
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
    service_date: "Service Date",
service_type: "Service Type",
third_party_company_name: "Third-Party Company",
current_expires_at: "Expiration Date",
chart_recorder_file_url: "Chart Recorder",
jsa_file_url: "JSA",
one_call_file_url: "811 / One-Call",
responsibility_acknowledged: "Responsibility Acknowledged",
responsibility_acknowledged_at: "Acknowledged At",
  };

  return labels[key] || key;
}

function formatValue(value) {
  if (value === null || value === "") return "Blank / null";

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export default function AdminChangesPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");

  const canApproveChanges = !!session && hasPermission(session, "can_approve_changes");

  async function load() {
    try {
      const res = await fetch("/api/admin/changes", { cache: "no-store" });
      const j = await res.json();

      if (!res.ok) {
        throw new Error(j?.error || "Failed to load pending changes.");
      }

      setRows(Array.isArray(j?.changes) ? j.changes : []);
    } catch (err) {
      console.error("Failed to load pending changes:", err);
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
    } else if (status !== "loading") {
      setLoading(false);
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
              <th className="text-left p-3">Type</th>
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

                const changes =
  c.kind === "company_user_create_request"
    ? payload.new_user || {}
    : c.kind === "third_party_service_request"
    ? payload.third_party_service || {}
    : payload.changes || {};

                const entries = Object.entries(changes || {});

                const typeLabel =
  c.kind === "company_user_create_request"
    ? "Company User Request"
    : c.kind === "third_party_service_request"
    ? "Third-Party Service Request"
    : "Well Update Request";

                return (
                  <tr key={c.id} className="border-t align-top">
                    <td className="p-3">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                    </td>

                    <td className="p-3">
                      <div className="font-medium">{typeLabel}</div>
                      {payload.api ? (
                        <div className="text-xs text-gray-500 font-mono">
                          API: {payload.api}
                        </div>
                      ) : null}
                      {payload.company_name ? (
                        <div className="text-xs text-gray-500">
                          {payload.company_name}
                        </div>
                      ) : null}
                    </td>

                    <td className="p-3">
                      <div>{payload.requested_by_name || c.submitted_by || "—"}</div>
                      {payload.requested_by_email ? (
                        <div className="text-xs text-gray-500">
                          {payload.requested_by_email}
                        </div>
                      ) : null}
                      {payload.requested_by_role ? (
                        <div className="text-xs text-gray-500 capitalize">
                          {payload.requested_by_role}
                        </div>
                      ) : null}
                    </td>

                    <td className="p-3">
                      {entries.length === 0 ? (
                        <div className="text-gray-500">No details found.</div>
                      ) : (
                        <div className="space-y-2">
                          {entries.map(([key, value]) => (
                            <div key={key} className="rounded-lg border p-2 bg-gray-50">
                              <div className="text-xs font-semibold text-gray-700">
                                {prettyLabel(key)}
                              </div>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words font-sans">
                                {formatValue(value)}
                              </pre>
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
