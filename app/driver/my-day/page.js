export default function MyDay() {
  const yard = "1122 Tatum Highway, Lovington, NM 88260";
  const start = "6:00 AM";

  // Demo stops; replace with real data later
  const stops = [
    { customer: "Select Demo Energy", api: "30-015-54321", county: "Eddy, NM", need: "Today", exp: "2026-02-01" },
    { customer: "Pioneer Basin Ops",  api: "30-025-11111", county: "Lea, NM",  need: "Today", exp: "2026-03-20" },
    { customer: "Maverick Resources", api: "30-041-22222", county: "Roosevelt, NM", need: "Within 7 days", exp: "2025-12-01" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Day — Driver Route</h1>
          <p className="text-sm text-gray-600">
            Yard: {yard} • Start: {start}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Solid green buttons */}
          <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Optimize (Farthest → Yard)
          </button>
          <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Start Day
          </button>
        </div>
      </div>

      {/* Route list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y">
        {stops.map((s, i) => (
          <div key={i} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="font-semibold">{s.customer}</div>
              <div className="text-xs text-gray-600 mt-1">API: {s.api}</div>
              <div className="text-xs text-gray-600">{s.county}</div>
            </div>

            <div className="text-sm">
              <div>Need-by: <span className="font-medium">{s.need}</span></div>
              <div>Expiration: <span className="font-medium">{s.exp}</span></div>
            </div>

            {/* Actions */}
            <div className="md:text-right flex md:justify-end gap-2">
              {/* White-outline button — readable on hover */}
              <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
                Add Note
              </button>
              {/* Solid green */}
              <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
                Mark Complete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer utility */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
          Add Assigned Jobs
        </button>
        <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
          Reorder Manually
        </button>
      </div>
    </div>
  );
}
