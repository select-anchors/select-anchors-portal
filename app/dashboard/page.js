// /app/dashboard/page.js
import Link from "next/link";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

function fmtDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function Dashboard() {
  const session = await getSession();

  // If not logged in, punt to /login
  if (!session.isAuthenticated) {
    return (
      <div className="container py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-2">Please sign in</h1>
          <p className="text-gray-600 mb-4">You need to log in to view your wells.</p>
          <Link href="/login" className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Admins: show upcoming wells (soonest expirations & tests)
  // Customers: show only wells linked to their email
  let wells = [];
  if (session.role === "admin") {
    const { rows } = await q(
      `
      SELECT api, lease_well_name, company_name,
             last_test_date,
             LEAST(
               COALESCE(expires_ne, '9999-12-31'::date),
               COALESCE(expires_nw, '9999-12-31'::date),
               COALESCE(expires_se, '9999-12-31'::date),
               COALESCE(expires_sw, '9999-12-31'::date)
             ) AS next_expiration
      FROM wells_view
      ORDER BY next_expiration NULLS LAST, last_test_date NULLS LAST
      LIMIT 20
      `
    );
    wells = rows;
  } else {
    const { rows } = await q(
      `
      SELECT w.api, w.lease_well_name, w.company_name,
             w.last_test_date,
             LEAST(
               COALESCE(w.expires_ne, '9999-12-31'::date),
               COALESCE(w.expires_nw, '9999-12-31'::date),
               COALESCE(w.expires_se, '9999-12-31'::date),
               COALESCE(w.expires_sw, '9999-12-31'::date)
             ) AS next_expiration
      FROM wells_view w
      JOIN user_wells uw
        ON uw.api = w.api
      WHERE uw.user_email = $1
      ORDER BY next_expiration NULLS LAST, w.last_test_date NULLS LAST
      `,
      [session.email]
    );
    wells = rows;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Everyone can see these */}
        <Link href="/wells" className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100">
          All Wells
        </Link>
        <Link href="/driver/my-day" className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100">
          My Day
        </Link>
        <Link href="/account" className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100">
          Account
        </Link>

        {/* Admin-only */}
        {session.role === "admin" && (
          <>
            <Link href="/admin/wells/new" className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
              New Well
            </Link>
            <Link href="/admin/wells" className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100">
              Admin: All Wells
            </Link>
          </>
        )}
      </div>

      {/* Upcoming wells */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            {session.role === "admin" ? "Upcoming Wells (soonest expirations/tests)" : "Your Wells"}
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr className="border-b">
              <th className="py-3 pl-5 pr-4">Lease / Well</th>
              <th className="py-3 pr-4">API</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">Last Test</th>
              <th className="py-3 pr-5 text-right">Next Expiration</th>
            </tr>
          </thead>
          <tbody>
            {wells.length === 0 && (
              <tr>
                <td className="py-4 px-5 text-gray-500" colSpan={5}>
                  {session.role === "admin" ? "No wells yet." : "No wells are linked to your account yet."}
                </td>
              </tr>
            )}
            {wells.map((w) => (
              <tr key={w.api} className="border-b last:border-0">
                <td className="py-3 pl-5 pr-4 font-medium">
                  <Link href={`/wells/${encodeURIComponent(w.api)}`} className="underline">
                    {w.lease_well_name || "Untitled Well"}
                  </Link>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap font-mono">{w.api}</td>
                <td className="py-3 pr-4">{w.company_name || "—"}</td>
                <td className="py-3 pr-4">{fmtDate(w.last_test_date)}</td>
                <td className="py-3 pr-5 text-right">{fmtDate(w.next_expiration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
