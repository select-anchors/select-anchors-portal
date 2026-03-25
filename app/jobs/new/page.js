// app/jobs/new/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";

function uniqueNonEmpty(values = []) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

export default function RequestJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const apiParam = searchParams.get("api") || "";
  const bulkApisParam = searchParams.get("apis") || "";
  const queryCompany = searchParams.get("company_name") || "";
  const queryLease = searchParams.get("lease_well_name") || "";
  const queryState = searchParams.get("state") || "";
  const queryCounty = searchParams.get("county") || "";

  const [loadingWell, setLoadingWell] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [selectedWells, setSelectedWells] = useState([]);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    lease_well_name: "",
    api: "",
    state: "",
    county: "",
    job_type: "Test existing anchors",
    priority: "Normal",
    preferred_date: "",
    requires_811: false,
    inside_city_limits: false,
    notes: "",
  });

  const bulkApis = useMemo(() => {
    if (!bulkApisParam) return [];
    return bulkApisParam
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [bulkApisParam]);

  const isBulkMode = bulkApis.length > 0;

  useEffect(() => {
    let mounted = true;

    async function loadSingleWell() {
      if (!apiParam || isBulkMode) return;

      try {
        setLoadingWell(true);

        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const well = await res.json();

        if (!mounted) return;

        setSelectedWells(well ? [well] : []);

        setForm((prev) => ({
          ...prev,
          api: well.api || apiParam || prev.api,
          lease_well_name: well.lease_well_name || queryLease || prev.lease_well_name,
          company_name: well.company_name || queryCompany || prev.company_name,
          state: well.state || queryState || prev.state,
          county: well.county || queryCounty || prev.county,
        }));
      } catch (err) {
        console.error("Failed to load single well for request form:", err);

        if (!mounted) return;

        setForm((prev) => ({
          ...prev,
          api: apiParam || prev.api,
          lease_well_name: queryLease || prev.lease_well_name,
          company_name: queryCompany || prev.company_name,
          state: queryState || prev.state,
          county: queryCounty || prev.county,
        }));
      } finally {
        if (mounted) setLoadingWell(false);
      }
    }

    loadSingleWell();

    return () => {
      mounted = false;
    };
  }, [apiParam, isBulkMode, queryCompany, queryCounty, queryLease, queryState]);

  useEffect(() => {
    let mounted = true;

    async function loadBulkWells() {
      if (!isBulkMode) return;

      try {
        setLoadingBulk(true);

        const res = await fetch("/api/wells", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load wells for bulk request.");
        }

        const json = await res.json();
        const wells = Array.isArray(json)
          ? json
          : Array.isArray(json?.wells)
          ? json.wells
          : [];

        const selected = wells.filter((w) => bulkApis.includes(w.api));

        if (!mounted) return;

        setSelectedWells(selected);

        const companyValues = uniqueNonEmpty(selected.map((w) => w.company_name));
        const stateValues = uniqueNonEmpty(selected.map((w) => w.state));
        const countyValues = uniqueNonEmpty(selected.map((w) => w.county));

        setForm((prev) => ({
          ...prev,
          api: "",
          lease_well_name: "",
          company_name:
            companyValues.length === 1
              ? companyValues[0]
              : companyValues.length > 1
              ? "Multiple companies"
              : prev.company_name,
          state: stateValues.length === 1 ? stateValues[0] : "",
          county: countyValues.length === 1 ? countyValues[0] : "",
        }));
      } catch (err) {
        console.error("Failed to load bulk wells for request form:", err);
      } finally {
        if (mounted) setLoadingBulk(false);
      }
    }

    loadBulkWells();

    return () => {
      mounted = false;
    };
  }, [isBulkMode, bulkApis]);

  function updateField(field) {
    return (e) => {
      const value =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;

      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    try {
      const payload = {
        title: isBulkMode
          ? `Request - ${bulkApis.length} wells`
          : form.lease_well_name
          ? `Request - ${form.lease_well_name}`
          : "Request a Test / Anchor Installation",
        company_name: form.company_name || null,
        lease_well_name: isBulkMode ? null : form.lease_well_name || null,
        well_api: isBulkMode ? null : form.api || null,
        state: form.state || null,
        county: form.county || null,
        job_type: form.job_type || null,
        priority: form.priority || null,
        preferred_date: form.preferred_date || null,
        requires_811: !!form.requires_811,
        inside_city_limits: !!form.inside_city_limits,
        notes: form.notes || null,
        apis: isBulkMode ? bulkApis : form.api ? [form.api] : [],
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to submit request.");
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Request submit failed:", err);
      setSubmitError(err.message || "Failed to submit request.");
    }
  }

  if (status === "loading") return null;
  if (!session) return <NotLoggedIn />;

  const isLoading = loadingWell || loadingBulk;

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">
        Request a Test / Anchor Installation
      </h1>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white border rounded-2xl p-6"
      >
        {isBulkMode && (
          <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
            <div className="text-sm">
              Request will apply to <b>{bulkApis.length}</b> wells.
            </div>

            {selectedWells.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Selected Wells</div>
                <div className="grid gap-2">
                  {selectedWells.map((well) => (
                    <div
                      key={well.api}
                      className="rounded-lg border bg-white px-3 py-2 text-sm"
                    >
                      <div className="font-medium">
                        {well.lease_well_name || "—"}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {well.api || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {well.company_name || "—"}
                        {(well.state || well.county) &&
                          ` • ${well.county || "—"}, ${well.state || "—"}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Company</label>
          <input
  className="w-full rounded-xl border px-3 py-2 bg-gray-100"
  value={form.company_name}
  readOnly={isBulkMode}
  onChange={updateField("company_name")}
  required
/>
        </div>

        {!isBulkMode && (
          <>
            <div>
              <label className="block text-sm font-medium">
                Lease / Well Name
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.lease_well_name}
                onChange={updateField("lease_well_name")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">API</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.api}
                readOnly
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">State</label>
            <input
  className="w-full rounded-xl border px-3 py-2 bg-gray-100"
  value={form.state}
  readOnly={isBulkMode}
  onChange={updateField("state")}
/>
          </div>

          <div>
            <label className="block text-sm font-medium">County</label>
            <input
  className="w-full rounded-xl border px-3 py-2 bg-gray-100"
  value={form.county}
  readOnly={isBulkMode}
  onChange={updateField("county")}
/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Job Type</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={form.job_type}
              onChange={updateField("job_type")}
            >
              <option>Test existing anchors</option>
              <option>Install new anchors</option>
              <option>Test + Install anchors</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Priority</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={form.priority}
              onChange={updateField("priority")}
            >
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Emergency</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Preferred Date</label>
          <input
            type="date"
            className="w-full rounded-xl border px-3 py-2"
            value={form.preferred_date}
            onChange={updateField("preferred_date")}
          />
        </div>

        <div className="flex gap-6 flex-wrap">
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={form.requires_811}
              onChange={updateField("requires_811")}
            />
            811 required
          </label>

          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={form.inside_city_limits}
              onChange={updateField("inside_city_limits")}
            />
            Inside city limits
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium">Notes</label>
          <textarea
            className="w-full rounded-xl border px-3 py-2"
            rows={4}
            value={form.notes}
            onChange={updateField("notes")}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Submit Request"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
