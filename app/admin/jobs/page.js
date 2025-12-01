// /app/admin/jobs/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatJobType(t) {
  if (t === "test_existing") return "Test existing anchors";
  if (t === "install_new") return "Install new anchors";
  if (t === "both") return "Test + Install";
  return t || "—";
}

function formatPriority(p) {
  if (p === "asap") return "ASAP";
  if (p === "normal") return "Normal";
  if (p === "deadline") return "Customer deadline";
  return p || "—";
}

function StatusBadge({ status }) {
  const label = status || "pending";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs capitalize">
      {label.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminJobsPage() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/jobs", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load jobs.");
        }
        setJobs(json.jobs || []);
      } catch (err) {
        setError(err.message || "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated" && session?.user?.role === "admin") {
      load();
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

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link
          href="/admin/jobs/new"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New Job
        </Link>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Driver</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Lease / Well</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Job Type</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">State / County</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={10}>
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-t align-top">
                  <td className="p-3">
                    {job.scheduled_date
                      ? formatDate(job.scheduled_date)
                      : "Not scheduled"}
                  </td>
                  <td className="p-3">{job.driver_name || "Unassigned"}</td>
                  <td className="p-3">{job.company_name || "—"}</td>
                  <td className="p-3">{job.lease_well_name || "—"}</td>
                  <td className="p-3 font-mono">{job.well_api || "—"}</td>
                  <td className="p-3">{formatJobType(job.job_type)}</td>
                  <td className="p-3">{formatPriority(job.priority)}</td>
                  <td className="p-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="p-3">
                    {[job.state, job.county].filter(Boolean).join(" / ") ||
                      "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="underline text-[#2f4f4f]"
                    >
                      Open
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
