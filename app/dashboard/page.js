// app/dashboard/page.js
export const dynamic = "force-dynamic";
import { sql } from "@vercel/postgres";

export default async function Dashboard() {
  let wells = [];
  try {
    const { rows } = await sql`
      select api, customer_name, state, county, need_by_date, created_at
      from wells
      order by need_by_date nulls last, created_at desc
      limit 200
    `;
    wells = rows;
  } catch (e) {
    // Render a friendly error instead of a blank digest
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-4">Upcoming Wells</h1>
        <div className="p-4 border border-red-300 bg-red-50 rounded-xl">
          <div className="font-semibold">Dashboard failed to load.</div>
          <div className="text-sm text-red-700 mt-1">
            {String(e)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Upcoming Wells</h1>
          <p className="text-sm text-gray-600">
            Default sort: <span className="font-medium">Need-by Soonest</span> •{" "}
            <span className="font-medium">Expiration Soonest</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
            Assign Truck
          </button>
          <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Add to My Day
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr className="border-b">
              <th className="py-3 pl-5 pr-4">Customer</th>
              <th className="py-3 pr-4">API</th>
              <th className="py-3 pr-4">County</th>
              <th className="py-3 pr-4">Need-by</th>
              <th className="py-3 pr-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {wells.map((w) => (
              <tr key={w.api} className="border-b last:border-0">
                <td className="py-3 pl-5 pr-4 font-medium">{w.customer_name}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{w.api}</td>
                <td className="py-3 pr-4">
                  {w.county ? `${w.county}${w.state ? `, ${w.state}` : ""}` : ""}
                </td>
                <td className="py-3 pr-4">{w.need_by_date || "-"}</td>
                <td className="py-3 pr-5 text-right">
                  <span className="inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700">
                    Pending
                  </span>
                </td>
              </tr>
            ))}
            {wells.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No wells yet. Add one from <span className="font-semibold">/admin/wells/new</span>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
