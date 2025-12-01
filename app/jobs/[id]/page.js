// /app/jobs/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function JobPublicStatusPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load job.");
        setJob(json.job);
      } catch (err) {
        setError(err.message || "Failed to load job.");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated") {
      loadJob();
    }
  }, [id, status]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }

  if (loading) {
    return <div className="container py-8">Loading job…</div>;
  }

  if (error || !job) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">Job not available</h1>
        <p className="text-gray-600 text-sm">
          {error || "We couldn’t find that job or you don’t have access to it."}
        </p>
      </div>
    );
  }

  const statusLabel = (job.status || "pending").replace(/_/g, " ");

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Job Status</h1>

      <div className="bg-white border rounded-2xl p-6 space-y-3">
        <div className="text-sm text-gray-600">Job ID</div>
        <div className="font-mono">{job.id}</div>

        <div className="text-sm text-gray-600 mt-3">Company</div>
        <div className="font-medium">{job.company_name || "—"}</div>

        <div className="text-sm text-gray-600 mt-3">Lease / Well</div>
        <div className="font-medium">{job.lease_well_name || "—"}</div>

        <div className="text-sm text-gray-600 mt-3">API</div>
        <div className="font-mono">{job.well_api || "—"}</div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-sm text-gray-600">State / County</div>
            <div className="font-medium">
              {job.state || "—"} / {job.county || "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Priority</div>
            <div className="font-medium capitalize">
              {(job.priority || "normal").replace(/_/g, " ")}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Scheduled date</div>
            <div className="font-medium">
              {job.scheduled_date ? fmtDate(job.scheduled_date) : "Not yet scheduled"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div className="font-medium capitalize">{statusLabel}</div>
          </div>
        </div>
      </div>

      {/* Simple timeline */}
      <div className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Created:</span>{" "}
            {fmtDate(job.created_at)}
          </li>
          {job.requires_811 && (
            <>
              <li>
                <span className="font-medium">811 required:</span> Yes
              </li>
              {job.one_call_number && (
                <li>
                  <span className="font-medium">One Call #:</span>{" "}
                  {job.one_call_number}
                </li>
              )}
              {job.one_call_submitted_at && (
                <li>
                  <span className="font-medium">811 submitted:</span>{" "}
                  {fmtDate(job.one_call_submitted_at)}
                </li>
              )}
              {job.safe_to_dig_after && (
                <li>
                  <span className="font-medium">Safe to dig after:</span>{" "}
                  {fmtDate(job.safe_to_dig_after)}
                </li>
              )}
            </>
          )}
          {job.status === "completed" && job.updated_at && (
            <li>
              <span className="font-medium">Completed:</span>{" "}
              {fmtDate(job.updated_at)}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
