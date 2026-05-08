// app/admin/changes/page.js
"use client";

import Link from "next/link";
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
    chart_recorder_file_url: "Chart Recorder",
    jsa_file_url: "JSA",
    one_call_file_url: "811 / One-Call",
    notes: "Notes",
    responsibility_acknowledged: "Responsibility Acknowledged",
    responsibility_acknowledged_at: "Acknowledged At",
  };

  return labels[key] || key;
}

function getTypeLabel(kind) {
  if (kind === "company_user_create_request") return "Company User Request";
  if (kind === "third_party_service_request") {
    return "Third-Party Anchor Service Submission";
  }
  return "Well Update Request";
}

function formatValue(value) {
  if (value === null || value === "" || value === undefined) return "Blank / null";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DetailValue({ value }) {
  if (typeof value === "string" && value.startsWith("data:")) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="underline text-[#2f4f4f] font-medium"
      >
        Open File
      </a>
    );
  }

  if (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  ) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="underline text-[#2f4f4f] font-medium break-all"
      >
        Open Link
      </a>
    );
  }

  return (
    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words font-sans">
      {formatValue(value)}
    </pre>
  );
}

export default function AdminChangesPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");

  const canApproveChanges =
    !!session && hasPermission(session, "can_approve_changes");

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

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
  <div>
    <h1 className="text-2xl font-bold">Pending Changes</h1>

    <p className="text-xs text-gray-500 mt-1">
      This list refreshes automatically every 2 minutes.
    </p>
  </div>

  <Link
    href="/admin/changes/history"
    className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
  >
    View Change History
  </Link>
</div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border rounded-2xl p-6 text-sm text-gray-600">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border rounded-2xl p-6 text-sm text-gray-600">
            No pending changes.
          </div>
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
            const typeLabel = getTypeLabel(c.kind);

            return (
              <div
                key={c.id}
                className="bg-white border rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="p-5 border-b bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full border bg-white text-sm font-medium">
                          {typeLabel}
                        </span>

                        {c.created_at ? (
                          <span className="text-sm text-gray-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-sm text-gray-600">
                        Submitted by{" "}
                        <span className="font-medium text-gray-900">
                          {payload.requested_by_name || c.submitted_by || "—"}
                        </span>
                        {payload.requested_by_email ? (
                          <span> · {payload.requested_by_email}</span>
                        ) : null}
                        {payload.requested_by_role ? (
                          <span className="capitalize">
                            {" "}
                            · {payload.requested_by_role}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                        {payload.api ? (
                          <span>
                            API:{" "}
                            <span className="font-mono text-gray-900">
                              {payload.api}
                            </span>
                          </span>
                        ) : null}

                        {payload.lease_well_name ? (
                          <span>
                            Well:{" "}
                            <span className="font-medium text-gray-900">
                              {payload.lease_well_name}
                            </span>
                          </span>
                        ) : null}

                        {payload.company_name ? (
                          <span>
                            Company:{" "}
                            <span className="font-medium text-gray-900">
                              {payload.company_name}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => act(c.id, "approve")}
                        disabled={actingId === c.id}
                        className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
                      >
                        {actingId === c.id ? "Working..." : "Approve"}
                      </button>

                      <button
                        onClick={() => act(c.id, "reject")}
                        disabled={actingId === c.id}
                        className="px-4 py-2 rounded-xl border border-red-400 text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {actingId === c.id ? "Working..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {c.kind === "third_party_service_request" && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <div className="font-semibold">
                        Third-party service disclosure
                      </div>
                      <div className="mt-1">
                        The customer is submitting documentation for work not
                        performed or certified by Select Anchors. Approving this
                        records it in service history as a third-party service.
                      </div>
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <div className="text-sm text-gray-500">No details found.</div>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 max-w-full overflow-hidden">
                      {entries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border p-3 bg-gray-50 min-w-0"
                        >
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {prettyLabel(key)}
                          </div>

                          <div className="text-sm min-w-0 overflow-hidden">
                            <DetailValue value={value} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
