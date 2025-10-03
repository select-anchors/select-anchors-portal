export default function Dashboard() {
  const rows = [
    { customer: 'Select Demo Energy', api: '30-015-54321', county: 'Eddy, NM',       need: 'Today',         exp: '2026-02-01', status: 'Scheduled' },
    { customer: 'Pioneer Basin Ops',  api: '30-025-11111', county: 'Lea, NM',        need: 'Within 7 days', exp: '2025-10-10', status: 'Pending'   },
    { customer: 'Maverick Resources', api: '30-041-22222', county: 'Roosevelt, NM',  need: 'This month',    exp: '2025-12-01', status: 'Queued'    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Upcoming Wells</h1>
          <p className="text-sm text-gray-600">
            Default sort: <span className="font-medium">Need-by Soonest</span> • <span className="font-medium">Expiration Soonest</span>
          </p>
        </div>

        {/* ACTIONS (top-right) */}
        <div className="flex gap-2">
          {/* White outline button — keeps dark text on hover */}
          <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
            Assign Truck
          </button>

          {/* Solid green button */}
          <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Add to My Day
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr className="border-b">
              <th className="py-3 pl-5 pr-4">Customer</th>
              <th className="py-3 pr-4">API</th>
              <th className="py-3 pr-4">County</th>
              <th className="py-3 pr-4">Need-by</th>
              <th className="py-3 pr-4">Expiration</th>
              <th className="py-3 pr-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 pl-5 pr-4 font-medium">{r.customer}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{r.api}</td>
                <td className="py-3 pr-4">{r.county}</td>
                <td className="py-3 pr-4">{r.need}</td>
                <td className="py-3 pr-4">{r.exp}</td>
                <td className="py-3 pr-5 text-right">
                  <span
                    className={
                      "inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold " +
                      (r.status === "Scheduled"
                        ? "bg-amber-500 text-white"
                        : r.status === "Pending"
                        ? "bg-gray-200 text-gray-800"
                        : "bg-gray-100 text-gray-700")
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* White outline buttons — readable on hover */}
        <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
          Export CSV
        </button>
        <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
          Filter
        </button>

        {/* Solid green */}
        <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
          New Job
        </button>
      </div>
    </div>
  );
}
