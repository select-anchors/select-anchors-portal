// app/admin/wells/page.js
export const dynamic = "force-dynamic";

async function getWells() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load wells");
  return res.json();
}

export default async function AdminWellsPage() {
  const wells = await getWells();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Wells</h1>
        <a
          href="/admin/wells/new"
          className="px-4 py-2 rounded-md border hover:bg-gray-50"
        >
          + New Well
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Lease / Well</th>
              <th className="text-left p-3">API</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Last Test</th>
              <th className="text-left p-3">Expires</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {wells.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="p-3">{w.lease_well_name}</td>
                <td className="p-3">{w.api}</td>
                <td className="p-3">{w.company_name}</td>
                <td className="p-3">{w.last_test_date ?? "-"}</td>
                <td className="p-3">{w.expiration_date ?? "-"}</td>
                <td className="p-3 capitalize">{w.status}</td>
                <td className="p-3">
                  <a
                    className="underline"
                    href={`/wells/${encodeURIComponent(w.api)}`}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
            {wells.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={7}>
                  No wells yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
