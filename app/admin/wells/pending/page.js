// app/admin/wells/pending/page.js
export const dynamic = "force-dynamic";

async function getPending() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells?status=pending`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function PendingWellsPage() {
  const wells = await getPending();

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Wells</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600 border-b">
            <tr>
              <th className="py-3 pl-5 pr-4">Lease / Well Name</th>
              <th className="py-3 pr-4">API</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">Submitted</th>
              <th className="py-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {wells.map((w) => (
              <tr key={w.api} className="border-b last:border-0">
                <td className="py-3 pl-5 pr-4">{w.lease_name || "-"}</td>
                <td className="py-3 pr-4">{w.api}</td>
                <td className="py-3 pr-4">{w.company || "-"}</td>
                <td className="py-3 pr-4">
                  {new Date(w.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 pr-5 text-right">
                  <form
                    action={`/admin/wells/pending/approve?api=${encodeURIComponent(w.api)}`}
                    method="post"
                    className="inline"
                  >
                    <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:opacity-90">
                      Approve
                    </button>
                  </form>
                  <form
                    action={`/admin/wells/pending/delete?api=${encodeURIComponent(w.api)}`}
                    method="post"
                    className="inline ml-2"
                  >
                    <button className="px-3 py-1.5 rounded-lg border border-gray-400 bg-white text-gray-800 hover:bg-gray-100">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {wells.length === 0 && (
              <tr>
                <td className="py-6 text-center text-gray-500" colSpan={5}>
                  Nothing pending right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
