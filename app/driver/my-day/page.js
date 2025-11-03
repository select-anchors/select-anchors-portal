"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MyDayPage() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStaff = session?.user?.role === "admin" || session?.user?.role === "employee";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Back this with your jobs endpoint when ready
        const res = await fetch("/api/driver/my-day", { cache: "no-store" });
        const j = res.ok ? await res.json() : { jobs: [] };
        if (mounted) setJobs(j.jobs ?? []);
      } catch {
        if (mounted) setJobs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <div className="container py-10">Please log in.</div>;
  if (!isStaff) return <div className="container py-10">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">My Day</h1>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Lease/Well</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Task</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={6}>Loading…</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td className="p-4" colSpan={6}>No jobs assigned.</td></tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3">
                    {j.when ? new Date(j.when).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">{j.company_name || "—"}</td>
                  <td className="p-3">{j.lease_well_name || "—"}</td>
                  <td className="p-3 font-mono">{j.api || "—"}</td>
                  <td className="p-3">{j.task || "—"}</td>
                  <td className="p-3">
                    {j.api ? (
                      <Link className="underline" href={`/wells/${encodeURIComponent(j.api)}`}>
                        Open
                      </Link>
                    ) : "—"}
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
