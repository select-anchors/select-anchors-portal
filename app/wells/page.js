"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function CustomerWellsPage() {
  const { data: session, status } = useSession();
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Server will scope by user role/email when not admin/employee
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();
        if (mounted) setWells(json?.wells ?? []);
      } catch {
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Wells</h1>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Lease/Well</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Last Test</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : wells.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  No wells found.
                </td>
              </tr>
            ) : (
              wells.map((w) => (
                <tr key={w.api} className="border-t">
                  <td className="p-3">{w.lease_well_name || "—"}</td>
                  <td className="p-3 font-mono">{w.api}</td>
                  <td className="p-3">{w.company_name || "—"}</td>
                  <td className="p-3">
                    {w.last_test_date
                      ? new Date(w.last_test_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/wells/${encodeURIComponent(w.api)}`}
                      className="underline"
                    >
                      View
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
