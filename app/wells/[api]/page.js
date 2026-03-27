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

function LatestAnchorStatus({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/wells/${encodeURIComponent(api)}/latest-anchor-status`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (mounted) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load latest anchor status:", err);
        if (mounted) {
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (api) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [api]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="text-sm text-gray-600">Loading latest anchor status…</div>
      </div>
    );
  }

  if (!data?.service) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-2">Latest Anchor Measurements</h2>
        <div className="text-sm text-gray-500">No anchor service history yet.</div>
      </div>
    );
  }

  const threshold = Number(data.service.threshold || 12);

  const exceedsAny = Array.isArray(data.anchors)
    ? data.anchors.some(
        (a) =>
          a?.inches_out_of_ground !== null &&
          a?.inches_out_of_ground !== undefined &&
          Number(a.inches_out_of_ground) > threshold
      )
    : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Latest Anchor Measurements</h2>
        <div className="text-sm text-gray-500">
          Service Date: {fmtDate(data.service.service_date)}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {!Array.isArray(data.anchors) || data.anchors.length === 0 ? (
          <div className="text-sm text-gray-500">No anchor measurements found.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.anchors.map((anchor) => {
              const inches = anchor?.inches_out_of_ground;
              const exceeds =
                inches !== null &&
                inches !== undefined &&
                Number(inches) > threshold;

              return (
                <div
                  key={anchor.anchor_position}
                  className={`rounded-xl border p-4 ${
                    exceeds
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {anchor.anchor_position || "Anchor"}
                    </div>

                    <div
                      className={`text-sm font-medium ${
                        exceeds ? "text-red-700" : "text-gray-700"
                      }`}
                    >
                      {inches !== null && inches !== undefined ? `${inches}" out` : "—"}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div>
                      Pass / Fail:{" "}
                      <span className="font-medium text-gray-800">
                        {anchor.pass_fail || "—"}
                      </span>
                    </div>

                    <div>
                      Deactivated:{" "}
                      <span className="font-medium text-gray-800">
                        {anchor.deactivated ? "Yes" : "No"}
                      </span>
                    </div>

                    <div>
                      Replacement Required:{" "}
                      <span className="font-medium text-gray-800">
                        {anchor.replacement_required ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            exceedsAny
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {exceedsAny
            ? `⚠ One or more anchors exceed the recommended exposure threshold (${threshold}"). Replacement should be considered.`
            : `All anchors are within the recommended exposure threshold (${threshold}").`}
        </div>
      </div>
    </div>
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
  const requestTestHref = `/jobs/new?api=${encodeURIComponent(
    w.api || ""
  )}&lease_well_name=${encodeURIComponent(
    w.lease_well_name || ""
  )}&company_name=${encodeURIComponent(
    w.company_name || ""
  )}&state=${encodeURIComponent(
    w.state || ""
  )}&county=${encodeURIComponent(w.county || "")}`;

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
            href={requestTestHref}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            Request a Test / Anchor Installation
          </Link>

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

      <LatestAnchorStatus api={w.api} />

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
    </div>
  );
}
