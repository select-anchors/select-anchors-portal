// app/dashboard/page.js
import Link from "next/link";
import { q } from "@/lib/db";

// Helper to format dates nicely
function fmt(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

// Build a safe query based on what columns actually exist.
// We first read the columns on the "wells" table, then compose a query that only
// references columns that are present (prevents “column XYZ does not exist”).
async function getUpcomingWells() {
  try {
    // 1) Discover columns
    const meta = await q(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_name = 'wells'
        ORDER BY ordinal_position`
    );
    const cols = new Set(meta.rows.map((r) => r.column_name));

    // 2) Pick fields that exist
    const hasLease      = cols.has("lease_name") || cols.has("lease");
    const leaseCol      = cols.has("lease_name") ? "w.lease_name" : (cols.has("lease") ? "w.lease" : "NULL");
    const hasCompanyId  = cols.has("company_id");
    const hasStatus     = cols.has("status");
    const hasNeedBy     = cols.has("need_by");
    const hasExpiration = cols.has("expiration") || cols.has("exp_date");
    const expirationCol = cols.has("expiration") ? "w.expiration" : (cols.has("exp_date") ? "w.exp_date" : null);
    const hasLastTest   = cols.has("last_test_date") || cols.has("last_test");
    const lastTestCol   = cols.has("last_test_date") ? "w.last_test_date" : (cols.has("last_test") ? "w.last_test" : null);
    const hasCounty     = cols.has("county");

    // Select list (only real columns)
    const selectParts = [
      "w.id",
      cols.has("api") ? "w.api" : "NULL AS api",
      `${leaseCol} AS lease_name`,
      hasCounty ? "w.county" : "NULL AS county",
      hasStatus ? "w.status" : "NULL AS status",
      hasNeedBy ? "w.need_by" : "NULL AS need_by",
      expirationCol ? `${expirationCol} AS expiration` : "NULL AS expiration",
      lastTestCol ? `${lastTestCol} AS last_test_date` : "NULL AS last_test_date",
    ];

    // Optional join to companies for display
    let join = "";
    let companySelect = "NULL AS company";
    if (hasCompanyId) {
      join = "LEFT JOIN companies c ON c.id = w.company_id";
      // Try a few likely company name columns; whichever exists will work
      const compCols = [
        "name",
        "company_name",
        "title",
      ];
      // Build COALESCE only with columns that exist
      const compMeta = await q(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_name = 'companies'`
      );
      const compSet = new Set(compMeta.rows.map((r) => r.column_name));
      const coalesceList = compCols.filter((c) => compSet.has(c)).map((c) => `c.${c}`);
      companySelect = coalesceList.length
        ? `COALESCE(${coalesceList.join(", ")}) AS company`
        : "NULL AS company";
    }
    selectParts.push(companySelect);

    // WHERE clause to approximate "upcoming":
    // - status hints (install / test_due / scheduled / pending)
    // - or need_by within 45 days
    // - or expiration within 60 days
    const whereParts = [];
    if (hasStatus) {
      whereParts.push(
        "w.status IN ('install','installation','scheduled','pending','test_due','due_test','needs_test')"
      );
    }
    if (hasNeedBy) {
      whereParts.push("w.need_by IS NOT NULL AND w.need_by <= NOW() + INTERVAL '45 days'");
    }
    if (expirationCol) {
      whereParts.push(`${expirationCol} IS NOT NULL AND ${expirationCol} <= NOW() + INTERVAL '60 days'`);
    }
    // If none of those columns exist, just show recent records
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" OR ")}` : "";

    // ORDER BY — prefer need_by then expiration then id desc
    const orderParts = [];
    if (hasNeedBy) orderParts.push("w.need_by NULLS LAST");
    if (expirationCol) orderParts.push(`${expirationCol} NULLS LAST`);
    orderParts.push("w.id DESC");
    const orderClause = `ORDER BY ${orderParts.join(", ")}`;

    const sql = `
      SELECT ${selectParts.join(", ")}
      FROM wells w
      ${join}
      ${whereClause}
      ${orderClause}
      LIMIT 10;
    `;

    const { rows } = await q(sql);
    return rows;
  } catch (err) {
    console.error("DASHBOARD_UPCOMING_QUERY_ERROR:", err);
    return [];
  }
}

const cards = [
  { href: "/admin/wells", label: "All Wells", desc: "Browse and search approved wells." },
  { href: "/admin/wells/new", label: "New Well", desc: "Create a new well (goes to Pending)." },
  { href: "/driver/my-day", label: "My Day", desc: "Driver schedule & today’s tasks." },
  { href: "/account", label: "Account", desc: "Profile & settings." },
];

export default async function Dashboard() {
  const upcoming = await getUpcomingWells();

  return (
    <div className="container py-8 space-y-6">
      {/* Top: title */}
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Button Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-gray-200 hover:border-gray-300 shadow-sm p-5 transition bg-white"
          >
            <div className="text-lg font-semibold mb-1">{c.label}</div>
            <div className="text-sm text-gray-600">{c.desc}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming Wells */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Wells</h2>
            <Link href="/admin/wells" className="text-sm underline">View all</Link>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Includes anchors to install and tests coming due.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            No upcoming items yet. Create a new well or check back later.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-3 pl-5 pr-4">Company</th>
                <th className="py-3 pr-4">Lease / Well</th>
                <th className="py-3 pr-4">API</th>
                <th className="py-3 pr-4">County</th>
                <th className="py-3 pr-4">Need-by</th>
                <th className="py-3 pr-4">Expiration</th>
                <th className="py-3 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="py-3 pl-5 pr-4">{w.company || ""}</td>
                  <td className="py-3 pr-4">{w.lease_name || ""}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{w.api || ""}</td>
                  <td className="py-3 pr-4">{w.county || ""}</td>
                  <td className="py-3 pr-4">{fmt(w.need_by)}</td>
                  <td className="py-3 pr-4">{fmt(w.expiration)}</td>
                  <td className="py-3 pr-5 text-right">
                    <span
                      className={
                        "inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold " +
                        (w.status === "install" || w.status === "scheduled"
                          ? "bg-amber-500 text-white"
                          : w.status === "test_due"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-700")
                      }
                    >
                      {w.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
