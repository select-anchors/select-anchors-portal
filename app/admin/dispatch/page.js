// /app/admin/dispatch/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function DispatchBoardPage() {
  const { data: session, status } = useSession();
  const [drivers, setDrivers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!session || session.user?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const [usersRes, jobsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/jobs", { cache: "no-store" }),
      ]);

      const usersJson = await usersRes.json();
      const jobsJson = await jobsRes.json();

      if (!usersRes.ok) throw new Error(usersJson?.error || "Failed users.");
      if (!jobsRes.ok) throw new Error(jobsJson?.error || "Failed jobs.");

      const driverList = (usersJson.users || []).filter((u) =>
        ["employee", "admin"].includes(u.role)
      );
      setDrivers(driverList);
      setJobs(jobsJson.jobs || []);
    } catch (err) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadData();
      const interval = setInterval(loadData, 2 * 60 * 1000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [status, session?.user?.role, loadData]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }

  async function updateJobAssignment(jobId, driverId, newIndex) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          driver_user_id: driverId || null,
          sort_order: newIndex,
        }),
      });
      if (!res.ok) {
        console.error("Failed to update job assignment");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function onDropJob(e, columnKey) {
    e.preventDefault();
    const jobId = Number(e.dataTransfer.getData("jobId"));
    if (!jobId) return;

    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (!job) return prev;

      const driverId = columnKey === "unassigned" ? null : Number(columnKey);

      // Gather jobs for that column to compute sort_order
      const columnJobs = prev
        .filter((j) =>
          driverId ? j.driver_user_id === driverId : !j.driver_user_id
        )
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const newIndex = columnJobs.length
        ? (columnJobs[columnJobs.length - 1].sort_order || 0) + 1
        : 0;

      const updated = prev.map((j) =>
        j.id === jobId
          ? { ...j, driver_user_id: driverId, sort_order: newIndex }
          : j
      );

      // Fire async update
      updateJobAssignment(jobId, driverId, newIndex);
      return updated;
    });
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  const grouped = {
    unassigned: jobs
      .filter((j) => !j.driver_user_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  };

  for (const d of drivers) {
    grouped[d.id] = jobs
      .filter((j) => j.driver_user_id === d.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  function JobCard({ job }) {
    return (
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("jobId", String(job.id))}
        className="border rounded-xl bg-white p-3 shadow-sm text-xs space-y-1 cursor-move"
      >
        <div className="font-semibold">
          {job.company_name || "Unnamed company"}
        </div>
        <div className="text-gray-600">
          {job.lease_well_name || "—"} ·{" "}
          <span className="font-mono">{job.well_api || "—"}</span>
        </div>
        <div className="text-gray-500">
          {job.state || "—"} / {job.county || "—"}
        </div>
        <div className="text-gray-500">
          {job.scheduled_date ? formatDate(job.scheduled_date) : "Not set"}
        </div>
        <div className="text-gray-500 capitalize">
          Status: {(job.status || "pending").replace(/_/g, " ")}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dispatch Board</h1>
        <div className="text-xs text-gray-500">
          {saving ? "Saving changes…" : "Drag jobs between drivers / columns."}
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 auto-cols-fr">
        {/* Unassigned */}
        <div
          className="bg-gray-50 border rounded-2xl p-3 min-h-[200px] flex flex-col gap-2"
          onDragOver={allowDrop}
          onDrop={(e) => onDropJob(e, "unassigned")}
        >
          <div className="font-semibold text-sm mb-1">
            Unassigned ({grouped.unassigned.length})
          </div>
          {grouped.unassigned.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>

        {/* Each driver */}
        {drivers.map((d) => (
          <div
            key={d.id}
            className="bg-gray-50 border rounded-2xl p-3 min-h-[200px] flex flex-col gap-2"
            onDragOver={allowDrop}
            onDrop={(e) => onDropJob(e, String(d.id))}
          >
            <div className="font-semibold text-sm mb-1">
              {d.name || d.email} – Jobs ({grouped[d.id]?.length || 0})
            </div>
            {(grouped[d.id] || []).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
