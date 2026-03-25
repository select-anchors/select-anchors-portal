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

  const apiParam = searchParams.get("api");
  const bulkApisParam = searchParams.get("apis");

  const [loadingWell, setLoadingWell] = useState(false);

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
    return bulkApisParam.split(",");
  }, [bulkApisParam]);

  const isBulkMode = bulkApis.length > 0;

  useEffect(() => {
    if (!apiParam || isBulkMode) return;

    async function loadWell() {
      try {
        setLoadingWell(true);

        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`);

        if (!res.ok) return;

        const well = await res.json();

        setForm((prev) => ({
          ...prev,
          api: well.api || "",
          lease_well_name: well.lease_well_name || "",
          company_name: well.company_name || "",
          state: well.state || "",
          county: well.county || "",
        }));
      } finally {
        setLoadingWell(false);
      }
    }

    loadWell();
  }, [apiParam, isBulkMode]);

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

    const payload = {
      ...form,
      apis: isBulkMode ? bulkApis : [form.api],
    };

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to submit request.");
      return;
    }

    router.push("/dashboard");
  }

  if (status === "loading") return null;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">
        Request a Test / Anchor Installation
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white border rounded-2xl p-6"
      >
        <div>
          <label className="block text-sm font-medium">
            Company
          </label>

          <input
            className="input"
            value={form.company_name}
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
                className="input"
                value={form.lease_well_name}
                onChange={updateField("lease_well_name")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                API
              </label>

              <input
                className="input"
                value={form.api}
                readOnly
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  State
                </label>

                <input
                  className="input"
                  value={form.state}
                  onChange={updateField("state")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">
                  County
                </label>

                <input
                  className="input"
                  value={form.county}
                  onChange={updateField("county")}
                />
              </div>
            </div>
          </>
        )}

        {isBulkMode && (
          <div className="text-sm bg-gray-50 border rounded-xl p-3">
            Request will apply to <b>{bulkApis.length}</b> wells.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">
              Job Type
            </label>

            <select
              className="input"
              value={form.job_type}
              onChange={updateField("job_type")}
            >
              <option>Test existing anchors</option>
              <option>Install new anchors</option>
              <option>Test + Install anchors</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Priority
            </label>

            <select
              className="input"
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
          <label className="block text-sm font-medium">
            Preferred Date
          </label>

          <input
            type="date"
            className="input"
            value={form.preferred_date}
            onChange={updateField("preferred_date")}
          />
        </div>

        <div className="flex gap-6">
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
          <label className="block text-sm font-medium">
            Notes
          </label>

          <textarea
            className="input"
            rows={4}
            value={form.notes}
            onChange={updateField("notes")}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white"
            disabled={loadingWell}
          >
            Submit Request
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
