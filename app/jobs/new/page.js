// app/jobs/new/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";

export default function RequestJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const apiParam = searchParams.get("api") || "";
  const bulkApisParam = searchParams.get("apis") || "";
  const leaseParam = searchParams.get("lease_well_name") || "";
  const companyParam = searchParams.get("company_name") || "";
  const stateParam = searchParams.get("state") || "";
  const countyParam = searchParams.get("county") || "";

  const bulkApis = useMemo(() => {
    if (!bulkApisParam) return [];
    return bulkApisParam
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [bulkApisParam]);

  const isBulkMode = bulkApis.length > 0;

  const [loadingWell, setLoadingWell] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [bulkWells, setBulkWells] = useState([]);

  const [form, setForm] = useState({
    company_name: companyParam,
    lease_well_name: leaseParam,
    api: apiParam,
    state: stateParam,
    county: countyParam,
    job_type: "Test existing anchors",
    priority: "Normal",
    preferred_date: "",
    requires_811: false,
    inside_city_limits: false,
    notes: "",
  });

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

  useEffect(() => {
    if (isBulkMode) return;
    if (!apiParam) return;

    let active = true;

    async function loadWell() {
      try {
        setLoadingWell(true);
        setError("");

        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Could not load well details.");
        }

        const well = await res.json();

        if (!active) return;

        setForm((prev) => ({
          ...prev,
          api: well.api || prev.api || "",
          lease_well_name: well.lease_well_name || prev.lease_well_name || "",
          company_name: well.company_name || prev.company_name || "",
          state: well.state || prev.state || "",
          county: well.county || prev.county || "",
        }));
      } catch (err) {
        console.error("Error loading well for request:", err);
        if (active) {
          setError(err.message || "Could not load well details.");
        }
      } finally {
        if (active) {
          setLoadingWell(false);
        }
      }
    }

    loadWell();

    return () => {
      active = false;
    };
  }, [apiParam, isBulkMode]);

  useEffect(() => {
    if (!isBulkMode) return;

    let active = true;

    async function loadBulkWells() {
      try {
        setLoadingBulk(true);
        setError("");

        const results = await Promise.all(
          bulkApis.map(async (api) => {
            try {
              const res = await fetch(`/api/wells/${encodeURIComponent(api)}`, {
                cache: "no-store",
              });

              if (!res.ok) return null;
              return await res.json();
            } catch {
              return null;
            }
          })
        );

        if (!active) return;

        const validWells = results.filter(Boolean);
        setBulkWells(validWells);

        const uniqueCompanies = [
          ...new Set(validWells.map((w) => (w.company_name || "").trim()).filter(Boolean)),
        ];

        setForm((prev) => ({
          ...prev,
          company_name:
            uniqueCompanies.length === 1
              ? uniqueCompanies[0]
              : prev.company_name || "",
        }));
      } catch (err) {
        console.error("Error loading bulk wells:", err);
        if (active) {
          setError("Could not load selected wells.");
        }
      } finally {
        if (active) {
          setLoadingBulk(false);
        }
      }
    }

    loadBulkWells();

    return () => {
      active = false;
    };
  }, [isBulkMode, bulkApis]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (isBulkMode) {
        if (bulkApis.length === 0) {
          throw new Error("No wells were selected.");
        }

        const targets =
          bulkWells.length > 0
            ? bulkWells
            : bulkApis.map((api) => ({
                api,
                lease_well_name: "",
                company_name: form.company_name || "",
                state: "",
                county: "",
              }));

        for (const well of targets) {
          const payload = {
            company_name: form.company_name || well.company_name || null,
            lease_well_name: well.lease_well_name || null,
            well_api: well.api || null,
            state: well.state || null,
            county: well.county || null,
            job_type:
              form.job_type === "Test existing anchors"
                ? "test_existing"
                : form.job_type === "Install new anchors"
                ? "install_new"
                : "both",
            priority:
              form.priority === "Low"
                ? "low"
                : form.priority === "High"
                ? "high"
                : form.priority === "Emergency"
                ? "asap"
                : "normal",
            scheduled_date: form.preferred_date || null,
            requires_811: !!form.requires_811,
            requires_white_flags: !!form.inside_city_limits,
            notes: form.notes || null,
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
            throw new Error(
              json?.error || `Failed to submit request for API ${well.api || "unknown"}.`
            );
          }
        }

        try {
          localStorage.removeItem("selected_wells");
        } catch {}

        setSuccess(`Submitted ${targets.length} request(s) successfully.`);
        setTimeout(() => {
          router.push("/dashboard");
        }, 900);

        return;
      }

      const payload = {
        company_name: form.company_name || null,
        lease_well_name: form.lease_well_name || null,
        well_api: form.api || null,
        state: form.state || null,
        county: form.county || null,
        job_type:
          form.job_type === "Test existing anchors"
            ? "test_existing"
            : form.job_type === "Install new anchors"
            ? "install_new"
            : "both",
        priority:
          form.priority === "Low"
            ? "low"
            : form.priority === "High"
            ? "high"
            : form.priority === "Emergency"
            ? "asap"
            : "normal",
        scheduled_date: form.preferred_date || null,
        requires_811: !!form.requires_811,
        requires_white_flags: !!form.inside_city_limits,
        notes: form.notes || null,
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

      setSuccess("Request submitted successfully.");
      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
    } catch (err) {
      console.error("Job request submit error:", err);
      setError(err.message || "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request a Test / Anchor Installation</h1>
        <p className="text-sm text-gray-600">
          Submit a request and Select Anchors will schedule your job.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white border rounded-2xl p-6"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Well</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={form.company_name}
              onChange={updateField("company_name")}
              required
            />
          </div>

          {!isBulkMode && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Lease / Well Name</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.lease_well_name}
                  onChange={updateField("lease_well_name")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 font-mono"
                  value={form.api}
                  readOnly
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={form.state}
                    onChange={updateField("state")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">County</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={form.county}
                    onChange={updateField("county")}
                  />
                </div>
              </div>
            </>
          )}

          {isBulkMode && (
            <div className="space-y-3">
              <div className="text-sm bg-gray-50 border rounded-xl p-3">
                Request will apply to <b>{bulkApis.length}</b> wells.
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-medium text-sm">
                  Selected Wells
                </div>

                <div className="max-h-72 overflow-auto divide-y">
                  {loadingBulk ? (
                    <div className="p-4 text-sm text-gray-600">Loading selected wells…</div>
                  ) : bulkWells.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">
                      No selected wells could be loaded. The request will still use the API list.
                    </div>
                  ) : (
                    bulkWells.map((well) => (
                      <div key={well.api} className="p-4 text-sm">
                        <div className="font-medium">{well.lease_well_name || "—"}</div>
                        <div className="text-gray-600 font-mono">API: {well.api || "—"}</div>
                        <div className="text-gray-600">
                          {well.company_name || "—"} • {well.state || "—"} • {well.county || "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Request Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
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
              <label className="block text-sm font-medium mb-1">Priority</label>
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
            <label className="block text-sm font-medium mb-1">Preferred Date</label>
            <input
              type="date"
              className="w-full rounded-xl border px-3 py-2"
              value={form.preferred_date}
              onChange={updateField("preferred_date")}
            />
          </div>

          <div className="flex flex-wrap gap-6">
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
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full rounded-xl border px-3 py-2 min-h-[120px]"
              rows={4}
              value={form.notes}
              onChange={updateField("notes")}
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
            disabled={loadingWell || loadingBulk || saving}
          >
            {saving
              ? isBulkMode
                ? "Submitting Requests…"
                : "Submitting Request…"
              : isBulkMode
              ? `Submit ${bulkApis.length} Requests`
              : "Submit Request"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
