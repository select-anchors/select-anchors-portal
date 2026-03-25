// app/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../components/NotLoggedIn";
import { hasPermission } from "../../lib/permissions";

/* helpers unchanged */
function fmtDate(d) {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString();
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function daysUntil(dateStr) {
  if (!dateStr) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Math.ceil(
      (new Date(y, m - 1, d) - new Date()) / (1000 * 60 * 60 * 24)
    );
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil(
    (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function bestExpiration(w) {
  return (
    w?.current_expires_at ??
    w?.latest_expires_at ??
    w?.expiration_date ??
    w?.expiration ??
    null
  );
}

function bestLastTest(w) {
  return w?.current_tested_at ?? w?.last_test_date ?? null;
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function ExpirationPill({ expirationDate, windowDays = 90 }) {
  const d = daysUntil(expirationDate);

  if (d === null) {
    return (
      <span className="pill-gray">—</span>
    );
  }

  const overdue = d < 0;
  const soon = d <= windowDays;

  const style = overdue
    ? "pill-red"
    : soon
    ? "pill-amber"
    : "pill-green";

  return (
    <span className={`pill ${style}`}>
      {overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
    </span>
  );
}

export default function CustomerWellsPage() {
  const { data: session, status } = useSession();

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApis, setSelectedApis] = useState([]);

  const sessionReady = status === "authenticated" && !!session;

  const canExportCsv =
    sessionReady && hasPermission(session, "can_export_csv");

  const canEdit =
    sessionReady &&
    (hasPermission(session, "can_edit_wells") ||
      hasPermission(session, "can_edit_company_contacts"));

  const selectedSet = useMemo(
    () => new Set(selectedApis),
    [selectedApis]
  );

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/wells");
      const json = await res.json();

      setWells(Array.isArray(json) ? json : json.wells || []);
      setLoading(false);
    }

    if (status === "authenticated") load();
  }, [status]);

  const bulkRequestHref = useMemo(() => {
    if (!selectedApis.length) return "/jobs/new";

    return `/jobs/new?apis=${encodeURIComponent(
      selectedApis.join(",")
    )}`;
  }, [selectedApis]);

  function toggleSelected(api) {
    setSelectedApis((prev) =>
      prev.includes(api)
        ? prev.filter((x) => x !== api)
        : [...prev, api]
    );
  }

  function clearSelected() {
    setSelectedApis([]);
  }

  if (status === "loading") return null;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Wells</h1>

        <div className="flex gap-2">
          {canExportCsv && (
            <a
              href="/api/wells/export"
              className="btn-outline"
            >
              Export CSV
            </a>
          )}

          {canEdit && (
            <Link
              href="/wells?edit=1"
              className="btn-outline"
            >
              Edit Contacts / Notes
            </Link>
          )}
        </div>
      </div>

      {/* selection toolbar moved LOWER */}

      {selectedApis.length > 0 && (
        <div className="flex items-center gap-3">

          <Link
            href={bulkRequestHref}
            className="btn-primary"
          >
            Bulk Request Test ({selectedApis.length})
          </Link>

          <button
            onClick={clearSelected}
            className="btn-outline"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* wells table */}

      <div className="table-card">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th />
              <th>Lease/Well</th>
              <th>API</th>
              <th>Company</th>
              <th>County</th>
              <th>State</th>
              <th>Last Test</th>
              <th>Expiration</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>Loading…</td>
              </tr>
            ) : (
              wells.map((w) => (
                <tr key={w.api}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(w.api)}
                      onChange={() =>
                        toggleSelected(w.api)
                      }
                    />
                  </td>

                  <td>{w.lease_well_name}</td>
                  <td>{w.api}</td>
                  <td>{w.company_name}</td>
                  <td>{w.county}</td>
                  <td>{w.state}</td>

                  <td>{fmtDate(bestLastTest(w))}</td>

                  <td>
                    <ExpirationPill
                      expirationDate={bestExpiration(w)}
                    />
                  </td>

                  <td>
                    <Link
                      href={`/jobs/new?api=${w.api}`}
                      className="link"
                    >
                      Request Test
                    </Link>
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
