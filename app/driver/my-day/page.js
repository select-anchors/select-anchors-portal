export default function MyDay() {
  const stops = [
    { customer: 'Select Demo Energy', api: '30-015-54321', need: 'Today', exp: '2026-02-01' },
    { customer: 'Pioneer Basin Ops', api: '30-025-11111', need: 'Today', exp: '2026-03-20' },
  ];
  return (
    <div className="container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Day — Driver Route</h1>
          <p className="text-sm text-gray-600">Lovington Yard • Start 6:00 AM</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary">Optimize (Farthest → Yard)</button>
          <button className="btn btn-primary">Start Day</button>
        </div>
      </div>

      <div className="card divide-y">
        {stops.map((s, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <div>
              <div className="font-semibold">{s.customer}</div>
              <div className="text-xs text-gray-600 mt-1">API: {s.api}</div>
            </div>
            <div className="text-sm text-gray-700">Need: {s.need}</div>
            <div className="md:text-right text-sm">Exp: {s.exp}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
