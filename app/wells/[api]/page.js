// app/wells/[api]/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import WellLocationMap from "../../components/WellLocationMap";
import { hasPermission } from "../../../lib/permissions";

function fmtDate(d) {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    const local = new Date(y, m - 1, day);
    return local.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    return Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  return Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function StatusPill({ status, daysLeft }) {
  const s = status || "unknown";

  const cls =
    s === "expired"
      ? "bg-red-50 text-red-700 border-red-200"
      : s === "expiring"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : s === "good"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-600 border-gray-200";

  const label =
    s === "expired"
      ? "Expired"
      : s === "expiring"
      ? "Expiring Soon"
      : s === "good"
      ? "Good"
      : "Unknown";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm rounded-full border ${cls}`}
    >
      {label}
      {typeof daysLeft === "number" && (
        <span className="ml-2 text-xs opacity-80">
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
        </span>
      )}
    </span>
  );
}

function ExpirationBadge({ daysLeft }) {
  const cls =
    typeof daysLeft !== "number"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : daysLeft < 0
      ? "bg-red-50 text-red-700 border-red-200"
      : daysLeft <= 90
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-green-50 text-green-700 border-green-200";

  const dot =
    typeof daysLeft !== "number"
      ? "bg-gray-400"
      : daysLeft < 0
      ? "bg-red-600"
      : daysLeft <= 90
      ? "bg-amber-600"
      : "bg-green-600";

  const text =
    typeof daysLeft !== "number"
      ? "No expiration"
      : daysLeft < 0
      ? `${Math.abs(daysLeft)} days overdue`
      : `${daysLeft} days left`;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full border ${cls}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

function ServiceTypeBadge({ type }) {
  const value = String(type || "service").toLowerCase();

  const cls =
    value === "install_test"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : value === "test"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  const label =
    value === "install_test" ? "Install & Test" :
    value === "test" ? "Test" :
    type || "Service";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs ${cls}`}>
      {label}
    </span>
  );
}

function groupAnchorsByPosition(anchors = []) {
  const order = ["NW", "NE", "SE", "SW"];
  const map = new Map();

  for (const anchor of anchors) {
    const key = String(anchor.anchor_position || "").toUpperCase();
    map.set(key, anchor);
  }

  return order
    .map((pos) => map.get(pos))
    .filter(Boolean)
    .concat(
      anchors.filter((a) => !order.includes(String(a.anchor_position || "").toUpperCase()))
    );
}

export default function WellDetailPage({ params }) {
  const { data: session, status } = useSession();

  const apiParam = useMemo(() => {
    return params?.api ? decodeURIComponent(params.api) : null;
  }, [params]);

  const [well, setWell] = useState(null);
  const [loading, setLoading] = useState(true);

  const canViewAllWells =
    !!session && hasPermission(session, "can_view_all_wells");
  const canEditWells = !!session && hasPermission(session, "can_edit_wells");
  const canEditCompanyContacts =
    !!session && hasPermission(session, "can_edit_company_contacts");

  const canShowEdit = canEditWells || canEditCompanyContacts;
  const canAddService = canEditWells;
  const wellsHref = canViewAllWells ? "/admin/wells" : "/wells";

  useEffect(() => {
    let mounted = true;

    async function loadWell() {
      if (!apiParam) return;

      try {
        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Not found");

        const j = await res.json();

        if (mounted) setWell(j ?? null);
      } catch (err) {
        console.error("Error loading well detail:", err);
        if (mounted) setWell(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadWell();

    return () => {
      mounted = false;
    };
  }, [apiParam]);

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!apiParam) return <div className="container py-10">Loading…</div>;
  if (loading) return <div className="container py-10">Loading well…</div>;

  if (!well) {
    return (
      <div className="container py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-2">Well not found</h1>
          <p className="text-gray-600 mb-4">API: {apiParam}</p>
          <Link href={wellsHref} className="underline text-[#2f4f4f]">
            ← Back to All Wells
          </Link>
        </div>
      </div>
    );
  }

  const w = well;
  const serviceHistory = Array.isArray(w.service_history) ? w.service_history : [];

  const lastTest = w.current_tested_at ?? w.last_test_date ?? null;
  const expires =
    w.current_expires_at ??
    w.latest_expires_at ??
    w.expiration_date ??
    w.expiration ??
    null;

  const EXPIRING_WINDOW_DAYS = 90;
  const computedStatus = statusFromExpiration(expires, EXPIRING_WINDOW_DAYS);
  const daysLeft = daysUntil(expires);

  const editHref = `/wells/${encodeURIComponent(w.api)}/edit`;
  const requestHref = `/jobs/new?api=${encodeURIComponent(
    w.api || ""
  )}&lease_well_name=${encodeURIComponent(
    w.lease_well_name || ""
  )}&company_name=${encodeURIComponent(
    w.company_name || ""
  )}&state=${encodeURIComponent(
    w.state || ""
  )}&county=${encodeURIComponent(
    w.county || ""
  )}`;
  const addServiceHref = `/wells/${encodeURIComponent(w.api)}/services/new`;

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            {w.lease_well_name ?? "Untitled Well"}
          </h1>

          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="text-gray-600">API:</span>{" "}
              <span className="font-mono">{w.api}</span>
            </p>

            {(w.latitude || w.longitude) && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-600">Lat / Lng:</span>{" "}
                {w.latitude ?? "—"}, {w.longitude ?? "—"}
              </p>
            )}

            {w.wellhead_coords && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-600">Well Head GPS:</span>{" "}
                <a
                  className="text-blue-600 underline break-all"
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    w.wellhead_coords
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {w.wellhead_coords}
                </a>
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={computedStatus} daysLeft={daysLeft} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={requestHref}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            Request a Test / Anchor Installation
          </Link>

          {canAddService && (
            <Link
              href={addServiceHref}
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Add Service
            </Link>
          )}

          {canShowEdit && (
            <Link
              href={editHref}
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Edit
            </Link>
          )}

          <Link
            href={wellsHref}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
          >
            All Wells
          </Link>
        </div>
      </div>

      <WellLocationMap
        coords={w.wellhead_coords}
        title={
          w.lease_well_name ? `${w.lease_well_name} Location` : "Well Location"
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Company</h2>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Company</div>
            <div className="font-medium">{w.company_name ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Phone</div>
            <div className="font-medium">{w.company_phone ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium">{w.company_email ?? "—"}</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-600">Address</div>
            <div className="font-medium">{w.company_address ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Company Man</h2>
        </div>

        <div className="p-6 grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{w.company_man_name ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Phone</div>
            <div className="font-medium">{w.company_man_phone ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium break-all">
              {w.company_man_email ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Test Dates</h2>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600">Last Test Date</div>
            <div className="font-medium">{fmtDate(lastTest)}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Expiration Date</div>
            <div className="font-medium">{fmtDate(expires)}</div>

            <div className="mt-2">
              <ExpirationBadge daysLeft={daysLeft} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">History & Notes</h2>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600">Previous Anchor Work</div>
            <div className="font-medium whitespace-pre-wrap">
              {w.previous_anchor_work ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Directions & Other Notes</div>
            <div className="font-medium whitespace-pre-wrap">
              {w.directions_other_notes ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Service History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Past work completed for this well, including anchor measurements and uploaded service files.
          </p>
        </div>

        <div className="p-6">
          {serviceHistory.length === 0 ? (
            <div className="text-sm text-gray-600">No service history found yet.</div>
          ) : (
            <div className="space-y-6">
              {serviceHistory.map((service) => {
                const anchors = groupAnchorsByPosition(service.anchors || []);

                return (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-gray-200 overflow-hidden"
                  >
                    <div className="p-4 md:p-5 border-b bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-semibold">
                              {fmtDate(service.service_date)}
                            </div>
                            <ServiceTypeBadge type={service.service_type} />
                          </div>

                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <div>
                              <span className="text-gray-500">Tested by company:</span>{" "}
                              {service.tested_by_company || "—"}
                            </div>
                            <div>
                              <span className="text-gray-500">Technician:</span>{" "}
                              {service.technician_name || "—"}
                            </div>
                            <div>
                              <span className="text-gray-500">Invoice #:</span>{" "}
                              {service.invoice_number || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(service.recommended_action || service.notes) && (
                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Recommended Action
                            </div>
                            <div className="text-sm whitespace-pre-wrap">
                              {service.recommended_action || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Service Notes
                            </div>
                            <div className="text-sm whitespace-pre-wrap">
                              {service.notes || "—"}
                            </div>
                          </div>
                        </div>
                      )}

                      {(service.jsa_file_url ||
                        service.chart_recorder_file_url ||
                        service.invoice_file_url) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {service.jsa_file_url && (
                            <a
                              href={service.jsa_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl border text-sm hover:bg-white"
                            >
                              Open JSA
                            </a>
                          )}

                          {service.chart_recorder_file_url && (
                            <a
                              href={service.chart_recorder_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl border text-sm hover:bg-white"
                            >
                              Open Chart Recorder
                            </a>
                          )}

                          {service.invoice_file_url && (
                            <a
                              href={service.invoice_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl border text-sm hover:bg-white"
                            >
                              Open Invoice
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 md:p-5">
                      <div className="font-medium mb-3">Anchor Measurements</div>

                      {anchors.length === 0 ? (
                        <div className="text-sm text-gray-600">
                          No anchor measurements recorded for this service.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-gray-600 bg-gray-50">
                              <tr>
                                <th className="text-left p-3">Position</th>
                                <th className="text-left p-3">Inches Out of Ground</th>
                                <th className="text-left p-3">Pull Result (lbs)</th>
                                <th className="text-left p-3">Pass / Fail</th>
                                <th className="text-left p-3">Deactivated</th>
                                <th className="text-left p-3">Replacement Required</th>
                                <th className="text-left p-3">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {anchors.map((anchor) => (
                                <tr key={anchor.id} className="border-t">
                                  <td className="p-3 font-medium">
                                    {anchor.anchor_position || "—"}
                                  </td>
                                  <td className="p-3">
                                    {fmtNumber(anchor.inches_out_of_ground)}
                                  </td>
                                  <td className="p-3">
                                    {fmtNumber(anchor.pull_result_lbs)}
                                  </td>
                                  <td className="p-3">
                                    {anchor.pass_fail || "—"}
                                  </td>
                                  <td className="p-3">
                                    {anchor.deactivated ? "Yes" : "No"}
                                  </td>
                                  <td className="p-3">
                                    {anchor.replacement_required ? "Yes" : "No"}
                                  </td>
                                  <td className="p-3 whitespace-pre-wrap">
                                    {anchor.notes || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
