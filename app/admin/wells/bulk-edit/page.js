// app/admin/wells/bulk-edit/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../components/NotLoggedIn";
import { hasPermission } from "../../../../lib/permissions";

function uniqueNonEmpty(values = []) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

export default function AdminBulkEditWellsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionReady = status === "authenticated" && !!session;
  const canEditWells = sessionReady && hasPermission(session, "can_edit_wells");
  const canBulkEditWells =
    sessionReady && hasPermission(session, "can_bulk_edit_wells");

  const canUsePage = canEditWells && canBulkEditWells;

  const queryApis = searchParams.get("apis") || "";

  const [apiText, setApiText] = useState("");
  const [loadingWells, setLoadingWells] = useState(false);
  const [selectedWells, setSelectedWells] = useState([]);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",
    previous_anchor_company: "",
    previous_anchor_work: "",
    directions_other_notes: "",
    state: "",
    county: "",
    wellhead_coords: "",
    status: "",
  });

  const [applyField, setApplyField] = useState({
    company_name: false,
    company_email: false,
    company_phone: false,
    company_address: false,
    company_man_name: false,
    company_man_email: false,
    company_man_phone: false,
    previous_anchor_company: false,
    previous_anchor_work: false,
    directions_other_notes: false,
    state: false,
    county: false,
    wellhead_coords: false,
    status: false,
  });

  useEffect(() => {
    if (queryApis) {
      setApiText(queryApis.split(",").join("\n"));
    }
  }, [queryApis]);

  const apis = useMemo(() => {
    return uniqueNonEmpty(
      apiText
        .split(/[\n,\s]+/g)
        .map((x) => x.trim())
        .filter(Boolean)
    );
  }, [apiText]);

  async function loadSelectedWells() {
    if (apis.length === 0) {
      setSelectedWells([]);
      return;
    }

    try {
      setLoadingWells(true);
      setSaveError("");
      setSaveSuccess("");

      const res = await fetch("/api/wells", { cache: "no-store" });
      const json = await res.json();

      const wells = Array.isArray(json)
        ? json
        : Array.isArray(json?.wells)
        ? json.wells
        : [];

      const matched = wells.filter((w) => apis.includes(w.api));
      setSelectedWells(matched);
    } catch (err) {
      console.error("Failed to load wells for bulk edit:", err);
      setSelectedWells([]);
      setSaveError("Failed to load selected wells.");
    } finally {
      setLoadingWells(false);
    }
  }

  useEffect(() => {
    if (!canUsePage) return;
    if (apis.length === 0) {
      setSelectedWells([]);
      return;
    }
    loadSelectedWells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUsePage, apiText]);

  function updateField(field) {
    return (e) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };
  }

  function toggleApply(field) {
    setApplyField((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    if (apis.length === 0) {
      setSaveError("Please enter at least one API.");
      return;
    }

    const changes = {};
    for (const [field, shouldApply] of Object.entries(applyField)) {
      if (shouldApply) {
        changes[field] = form[field];
      }
    }

    if (Object.keys(changes).length === 0) {
      setSaveError("Select at least one field to apply.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/admin/wells/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apis,
          changes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Bulk update failed.");
      }

      setSaveSuccess(`Updated ${json.updated_count || 0} wells successfully.`);
      await loadSelectedWells();
    } catch (err) {
      console.error("Bulk edit failed:", err);
      setSaveError(err.message || "Bulk update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  if (!canUsePage) {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bulk Edit Wells</h1>
          <p className="text-sm text-gray-600">
            Apply the same changes to multiple wells at once.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/wells"
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Back to All Wells
          </Link>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {saveSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Select Wells</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              APIs (one per line, comma-separated, or pasted list)
            </label>
            <textarea
              rows={8}
              className="w-full rounded-xl border px-3 py-2 font-mono"
              value={apiText}
              onChange={(e) => setApiText(e.target.value)}
              placeholder={"30-025-36332\n30-025-30349\n30-005-27939"}
            />
          </div>

          <div className="text-sm text-gray-600">
            {apis.length} API{apis.length === 1 ? "" : "s"} entered
          </div>

          <div className="border rounded-xl p-4 bg-gray-50">
            <div className="font-medium mb-2">Matched Wells</div>

            {loadingWells ? (
              <div className="text-sm text-gray-600">Loading wells…</div>
            ) : selectedWells.length === 0 ? (
              <div className="text-sm text-gray-600">No wells loaded yet.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {selectedWells.map((w) => (
                  <div key={w.api} className="rounded-xl border bg-white px-3 py-2">
                    <div className="font-medium">{w.lease_well_name || "—"}</div>
                    <div className="text-xs text-gray-500 font-mono">{w.api}</div>
                    <div className="text-xs text-gray-500">
                      {w.company_name || "—"}
                      {(w.county || w.state) &&
                        ` • ${w.county || "—"}, ${w.state || "—"}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Bulk Changes</h2>
          <p className="text-sm text-gray-600">
            Check the box next to each field you want applied to all selected wells.
          </p>

          {[
            ["company_name", "Company Name"],
            ["company_email", "Company Email"],
            ["company_phone", "Company Phone"],
            ["company_address", "Company Address"],
            ["company_man_name", "Company Man Name"],
            ["company_man_email", "Company Man Email"],
            ["company_man_phone", "Company Man Phone"],
            ["previous_anchor_company", "Previous Anchor Company"],
            ["previous_anchor_work", "Previous Anchor Work"],
            ["directions_other_notes", "Directions & Other Notes"],
            ["state", "State"],
            ["county", "County"],
            ["wellhead_coords", "Wellhead Coords"],
            ["status", "Status"],
          ].map(([field, label]) => (
            <div key={field} className="grid md:grid-cols-[28px_220px_1fr] gap-3 items-start">
              <input
                type="checkbox"
                checked={applyField[field]}
                onChange={() => toggleApply(field)}
                className="mt-3"
              />

              <label className="text-sm font-medium pt-2">{label}</label>

              {field === "previous_anchor_work" || field === "directions_other_notes" ? (
                <textarea
                  rows={4}
                  className={`w-full rounded-xl border px-3 py-2 ${
                    !applyField[field] ? "bg-gray-50 text-gray-400" : ""
                  }`}
                  value={form[field]}
                  onChange={updateField(field)}
                  disabled={!applyField[field]}
                />
              ) : (
                <input
                  className={`w-full rounded-xl border px-3 py-2 ${
                    !applyField[field] ? "bg-gray-50 text-gray-400" : ""
                  }`}
                  value={form[field]}
                  onChange={updateField(field)}
                  disabled={!applyField[field]}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Applying Changes…" : "Apply Bulk Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/wells")}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
