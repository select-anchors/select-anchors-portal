export default function Dashboard() {
  const rows = [
    { customer: 'Select Demo Energy', api: '30-015-54321', county: 'Eddy, NM', need: 'Today', exp: '2026-02-01' },
    { customer: 'Pioneer Basin Ops', api: '30-025-11111', county: 'Lea, NM',  need: 'Within 7 days', exp: '2025-10-10' },
  ];
  return (
    <div className="container space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upcoming Wells</h1>
          <p className="text-sm text-gray-600">Default sort: Need-by Soonest • Expiration Soonest</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">Assign Truck</button>
          <button className="btn btn-primary">Add to My Day</button>
        </div>
      </div>

      <div className="card">
        <div className="card-section overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">API</th>
                <th className="py-2 pr-4">County</th>
                <th className="py-2 pr-4">Need-by</th>
                <th className="py-2 pr-4">Expiration</th>
                <th className="py-2 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{r.customer}</td>
                  <td className="py-3 pr-4">{r.api}</td>
                  <td className="py-3 pr-4">{r.county}</td>
                  <td className="py-3 pr-4">{r.need}</td>
                  <td className="py-3 pr-4">{r.exp}</td>
                  <td className="py-3 pr-0 text-right">
                    <span className="badge badge-warn">Scheduled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
