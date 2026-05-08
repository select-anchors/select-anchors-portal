// app/admin/changes/history/page.js
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../components/NotLoggedIn";
import { hasPermission } from "../../../../lib/permissions";

function getTypeLabel(kind) {
  if (kind === "company_user_create_request") return "Company User Request";
  if (kind === "third_party_service_request") return "Third-Party Service";
  return "Well Update";
}

function getDetails(change) {
  const payload = change.payload || {};

  if (change.kind === "company_user_create_request") {
    return payload.new_user || {};
  }

  if (change.kind === "third_party_service_request") {
    return payload.third_party_service || {};
  }

  return payload.changes || {};
}

function formatValue(value) {
  if (value === null || value === "" || value === undefined) return "Blank / null";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DetailValue({ value }) {
  if (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:"))
  ) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="underline text-[#2f4f4f] font-medium"
      >
        Open File / Link
      </a>
    );
  }

  return (
    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words font-sans">
      {formatValue(value)}
    </pre>
  );
}

export default function AdminChangesHistoryPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const canApproveChanges =
    !!session && hasPermission(session, "can_approve_changes");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/changes/history", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load change history.");
        }

        setRows(Array.isArray(json?.changes) ? json.changes : []);
      } catch (err) {
        console.error("Failed to load change history:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated" && canApproveChanges) load();
    else if (status !== "loading") setLoading(false);
  }, [status, canApproveChanges]);

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  if (!canApproveChanges) {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Change History</h1>
          <p className="text-sm text-gray-600">
            Approved and rejected changes are kept here for review.
          </p>
        </div>

        <Link
          href="/admin/changes"
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          ← Pending Changes
        </Link>
      </div>

      {loading ? (
        <div className="bg-white border rounded-2xl p-6 text-sm text-gray-600">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-sm text-gray-600">
          No approved or rejected changes yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => {
            const payload = c.payload || {};
            const details = getDetails(c);
            const entries = Object.entries(details || {});

            const statusClass =
              c.status === "approved"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200";

            return (
              <div key={c.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b bg-gray-50 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full border bg-white text-sm font-medium">
                        {getTypeLabel(c.kind)}
                      </span>

                      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${statusClass}`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      Submitted:{" "}
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                    </div>

                    <div className="text-sm text-gray-600">
                      Decided:{" "}
                      {c.decided_at ? new Date(c.decided_at).toLocaleString() : "—"}
                    </div>

                    <div className="text-sm text-gray-600">
                      By:{" "}
                      <span className="font-medium text-gray-900">
                        {payload.requested_by_name || c.submitted_by || "—"}
                      </span>
                      {payload.requested_by_email ? ` · ${payload.requested_by_email}` : ""}
                    </div>

                    <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      {payload.api ? (
                        <span>
                          API: <span className="font-mono text-gray-900">{payload.api}</span>
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

                    {c.reason ? (
                      <div className="text-sm text-red-700">
                        Reason: {c.reason}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-5">
                  {entries.length === 0 ? (
                    <div className="text-sm text-gray-500">No details found.</div>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-xl border p-3 bg-gray-50 min-w-0">
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {key}
                          </div>
                          <DetailValue value={value} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
