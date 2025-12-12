// /app/admin/jobs/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function AdminJobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [job, setJob] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/jobs/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load job.");
        setJob(json.job);
      } catch (err) {
        setError(err.message || "Failed to load job.");
      } finally {
        setLoading(false);
      }
    }

    async function loadDrivers() {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) return;
        const list = (json.users || []).filter((u) =>
          ["employee", "admin"].includes(u.role)
        );
        setDrivers(list);
      } catch {
        // ignore
      }
    }

    if (status === "authenticated" && session?.user?.role === "admin") {
      loadJob();
      loadDrivers();
    }
  }, [id, status, session?.user?.role]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }

  if (loading || !job) {
    return <div className="container py-8">Loading job…</div>;
  }

  function upd(field, value) {
    setJob((prev) => ({ ...prev, [field]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const payload = {
        company_name: job.company_name,
        lease_well_name: job.lease_well_name,
        well_api: job.well_api,
        state: job.state,
        county: job.county,
        job_type: job.job_type,
        priority: job.priority,
        customer_deadline_date:
          job.priority === "deadline" && job.customer_deadline_date
            ? job.customer_deadline_date
            : null,
        requires_811: !!job.requires_811,
        one_call_state: job.one_call_state,
        one_call_number: job.one_call_number,
        one_call_submitted_at: job.one_call_submitted_at,
        safe_to_dig_after: job.safe_to_dig_after,
        requires_white_flags: !!job.requires_white_flags,
        select_anchors_installs_flags: !!job.select_anchors_installs_flags,
        mileage_multiplier: Number(job.mileage_multiplier) || 1,
        scheduled_date: job.scheduled_date,
        driver_user_id: job.driver_user_id || null,
        sort_order: job.sort_order || 0,
        status: job.status || "pending",
      };

      const res = await fetch(`/api/admin/jobs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save.");
      }
      setMsg("Saved.");
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this job?")) return;
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/admin/jobs");
    } catch (err) {
      setError(err.message || "Failed to delete.");
    }
  }

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Job #{job.id} – {job.company_name || "Untitled"}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/admin/jobs")}
          className="px-3 py-2 rounded-xl border"
        >
          Back to Jobs
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <form onSubmit={onSave} className="space-y-8">
        {/* Overview */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Overview</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Company</div>
              <input
                className="w-full"
                value={job.company_name || ""}
                onChange={(e) => upd("company_name", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Lease / Well</div>
              <input
                className="w-full"
                value={job.lease_well_name || ""}
                onChange={(e) => upd("lease_well_name", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">API</div>
              <input
                className="w-full font-mono"
                value={job.well_api || ""}
                onChange={(e) => upd("well_api", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">State</div>
              <input
                className="w-full"
                value={job.state || ""}
                onChange={(e) => upd("state", e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">County</div>
              <input
                className="w-full"
                value={job.county || ""}
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
                value={job.job_type || "test_existing"}
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
                value={job.priority || "normal"}
                onChange={(e) => upd("priority", e.target.value)}
              >
                <option value="asap">ASAP</option>
                <option value="normal">Normal</option>
                <option value="deadline">Customer deadline / date</option>
              </select>
            </label>

            {job.priority === "deadline" && (
              <label className="block">
                <div className="text-sm text-gray-600">Customer deadline</div>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={formatDate(job.customer_deadline_date)}
                  onChange={(e) =>
                    upd("customer_deadline_date", e.target.value)
                  }
                />
              </label>
            )}

            <label className="block">
              <div className="text-sm text-gray-600">Scheduled date</div>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={formatDate(job.scheduled_date)}
                onChange={(e) => upd("scheduled_date", e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Status</div>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={job.status || "pending"}
                onChange={(e) => upd("status", e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="waiting_on_811">Waiting on 811</option>
                <option value="scheduled">Scheduled</option>
                <option value="en_route">En route</option>
                <option value="on_site">On site</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="needs_install">Needs install</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
          </div>
        </div>

        {/* 811 & Flags */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">811 & White-Flags</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={!!job.requires_811}
                onChange={(e) => upd("requires_811", e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                811 One Call is required for this job
              </span>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">One Call State</div>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={job.one_call_state || ""}
                onChange={(e) => upd("one_call_state", e.target.value)}
                placeholder="TX / NM"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">One Call Number</div>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={job.one_call_number || ""}
                onChange={(e) => upd("one_call_number", e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">
                One Call submitted date/time
              </div>
              <input
                type="datetime-local"
                className="w-full border rounded-md px-3 py-2"
                value={
                  job.one_call_submitted_at
                    ? new Date(job.one_call_submitted_at)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) => upd("one_call_submitted_at", e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">
                Safe to dig after (3 business-day rule)
              </div>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={formatDate(job.safe_to_dig_after)}
                onChange={(e) => upd("safe_to_dig_after", e.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={!!job.requires_white_flags}
                onChange={(e) =>
                  upd("requires_white_flags", e.target.checked)
                }
              />
              <span className="text-sm text-gray-700">
                Location is inside city limits and white flags must be placed
              </span>
            </label>

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={!!job.select_anchors_installs_flags}
                onChange={(e) =>
                  upd("select_anchors_installs_flags", e.target.checked)
                }
              />
              <span className="text-sm text-gray-700">
                Select Anchors will be responsible to install white flags
                (additional mileage charge applies)
              </span>
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm text-gray-600">
                Mileage multiplier (1 = normal, 2 = double trip)
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-md px-3 py-2"
                value={job.mileage_multiplier || 1}
                onChange={(e) =>
                  upd("mileage_multiplier", Number(e.target.value) || 1)
                }
              />
            </label>
          </div>
        </div>

        {/* Driver & ordering */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Driver & Dispatch</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Driver</div>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={job.driver_user_id || ""}
                onChange={(e) =>
                  upd(
                    "driver_user_id", e.target.value || null
                  )
                }
              >
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.email} ({d.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">
                Sort order (per-driver queue)
              </div>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2"
                value={job.sort_order || 0}
                onChange={(e) =>
                  upd("sort_order", Number(e.target.value) || 0)
                }
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 rounded-xl border border-red-600 text-red-600"
          >
            Delete Job
          </button>
        </div>
      </form>
    </div>
  );
}
