// /app/admin/jobs/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function NewJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

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
    requires_811: false,
    requires_white_flags: false,
    select_anchors_installs_flags: false,
    mileage_multiplier: 1,
    scheduled_date: "",
    driver_user_id: "",
  });

  function upd(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function loadDrivers() {
      setLoadingDrivers(true);
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load users.");

        const driverCandidates = (json.users || []).filter((u) =>
          ["employee", "admin"].includes(u.role)
        );
        setDrivers(driverCandidates);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDrivers(false);
      }
    }

    if (status === "authenticated" && session?.user?.role === "admin") {
      loadDrivers();
    }
  }, [status, session?.user?.role]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const payload = {
        ...form,
        mileage_multiplier: Number(form.mileage_multiplier) || 1,
        driver_user_id: form.driver_user_id || null,
        customer_deadline_date:
          form.priority === "deadline" && form.customer_deadline_date
            ? form.customer_deadline_date
            : null,
      };

      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create job.");
      }

      setMsg("Job created successfully.");
      router.push(`/admin/jobs/${data.id}`);
    } catch (err) {
      setError(err.message || "Failed to create job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">New Job</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Company / Location */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Company & Location</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Company</div>
              <input
                className="w-full"
                value={form.company_name}
                onChange={(e) => upd("company_name", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Lease / Well Name</div>
              <input
                className="w-full"
                value={form.lease_well_name}
                onChange={(e) => upd("lease_well_name", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">API</div>
              <input
                className="w-full font-mono"
                value={form.well_api}
                onChange={(e) => upd("well_api", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">State</div>
              <input
                className="w-full"
                value={form.state}
                onChange={(e) => upd("state", e.target.value)}
                placeholder="TX / NM"
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">County</div>
              <input
                className="w-full"
                value={form.county}
                onChange={(e) => upd("county", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Job Details</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
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

            {form.priority === "deadline" && (
              <label className="block">
                <div className="text-sm text-gray-600">Customer deadline</div>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={form.customer_deadline_date}
                  onChange={(e) =>
                    upd("customer_deadline_date", e.target.value)
                  }
                />
              </label>
            )}

            <label className="block">
              <div className="text-sm text-gray-600">Scheduled date (optional)</div>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={form.scheduled_date}
                onChange={(e) => upd("scheduled_date", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* 811 & Flags */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">811 & White-Flag</h2>
          </div>
          <div className="p-6 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_811}
                onChange={(e) => upd("requires_811", e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                811 One Call is required for this job
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_white_flags}
                onChange={(e) => upd("requires_white_flags", e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Location is inside city limits and white flags must be placed
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.select_anchors_installs_flags}
                onChange={(e) =>
                  upd("select_anchors_installs_flags", e.target.checked)
                }
              />
              <span className="text-sm text-gray-700">
                Select Anchors will be responsible to install white flags
                (additional mileage charge applies)
              </span>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">
                Mileage multiplier (1 = normal, 2 = double trip)
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-md px-3 py-2"
                value={form.mileage_multiplier}
                onChange={(e) => upd("mileage_multiplier", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Driver assignment */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Driver Assignment</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Driver (optional)</div>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={form.driver_user_id}
                onChange={(e) => upd("driver_user_id", e.target.value)}
              >
                <option value="">Unassigned</option>
                {loadingDrivers ? (
                  <option>Loading…</option>
                ) : (
                  drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.email} ({d.role})
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Job"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border"
            onClick={() => router.push("/admin/jobs")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
