// app/jobs/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NotLoggedIn from "../../../app/components/NotLoggedIn";

export default function NewCustomerJobRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    lease_well_name: "",
    well_api: "",
    state: "",
    county: "",
    job_type: "test_existing",
    priority: "normal",
    customer_deadline_date: "",
    requested_date: "",
    requires_811: false,
    requires_white_flags: false,
    notes: "",
  });

  function upd(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // Prefill from query string
  useEffect(() => {
    const api = sp.get("api") || "";
    const lease = sp.get("lease_well_name") || "";
    const company = sp.get("company_name") || "";

    setForm((p) => ({
      ...p,
      well_api: api || p.well_api,
      lease_well_name: lease || p.lease_well_name,
      company_name: company || p.company_name,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  const role = session?.user?.role || "customer";
  if (role !== "customer" && role !== "admin" && role !== "employee") {
    return <div className="container py-10">Not authorized.</div>;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const payload = {
        company_name: form.company_name || null,
        lease_well_name: form.lease_well_name || null,
        well_api: form.well_api || null,
        state: form.state || null,
        county: form.county || null,
        job_type: form.job_type,
        priority: form.priority,
        customer_deadline_date:
          form.priority === "deadline" && form.customer_deadline_date
            ? form.customer_deadline_date
            : null,
        // “requested_date” is stored as scheduled_date for now (admin can adjust later)
        scheduled_date: form.requested_date || null,
        requires_811: !!form.requires_811,
        requires_white_flags: !!form.requires_white_flags,
        notes: form.notes || null,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to submit request.");

      setMsg("Request submitted!");
      router.push(`/jobs/${json.id}`);
    } catch (err) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request a Test</h1>
        <p className="text-sm text-gray-600">
          Submit a request and Select Anchors will schedule your job.
        </p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Well</h2>

          <label className="block">
            <div className="text-sm text-gray-600">Company</div>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={form.company_name}
              onChange={(e) => upd("company_name", e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">Lease / Well Name</div>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={form.lease_well_name}
              onChange={(e) => upd("lease_well_name", e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">API</div>
            <input
              className="w-full border rounded-md px-3 py-2 font-mono"
              value={form.well_api}
              onChange={(e) => upd("well_api", e.target.value)}
              placeholder="API number"
            />
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">State</div>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={form.state}
                onChange={(e) => upd("state", e.target.value)}
                placeholder="NM / TX"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">County</div>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={form.county}
                onChange={(e) => upd("county", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Request Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Job Type</div>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={form.job_type}
                onChange={(e) => upd("job_type", e.target.value)}
              >
                <option value="test_existing">Test existing anchors</option>
                <option value="install_new">Install new anchors</option>
                <option value="both">Test + Install</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Priority</div>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={form.priority}
                onChange={(e) => upd("priority", e.target.value)}
              >
                <option value="asap">ASAP</option>
                <option value="normal">Normal</option>
                <option value="deadline">Customer deadline / date</option>
              </select>
            </label>
          </div>

          {form.priority === "deadline" && (
            <label className="block">
              <div className="text-sm text-gray-600">Customer deadline date</div>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={form.customer_deadline_date}
                onChange={(e) => upd("customer_deadline_date", e.target.value)}
              />
            </label>
          )}

          <label className="block">
            <div className="text-sm text-gray-600">Preferred date (optional)</div>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2"
              value={form.requested_date}
              onChange={(e) => upd("requested_date", e.target.value)}
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_811}
                onChange={(e) => upd("requires_811", e.target.checked)}
              />
              <span className="text-sm text-gray-700">811 is required</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_white_flags}
                onChange={(e) => upd("requires_white_flags", e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Inside city limits (white flags required)
              </span>
            </label>
          </div>

          <label className="block">
            <div className="text-sm text-gray-600">Notes (optional)</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[110px]"
              value={form.notes}
              onChange={(e) => upd("notes", e.target.value)}
              placeholder="Anything we should know before arriving?"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit Request"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
