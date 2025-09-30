export default function Dashboard() {
  const cards = [
    { customer: 'Select Demo Energy', api: '30-015-54321', county: 'Eddy, NM', need: 'Today', exp: '2026-02-01' },
    { customer: 'Pioneer Basin Ops', api: '30-025-11111', county: 'Lea, NM',  need: 'Within 7 days', exp: '2025-10-10' },
  ];
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Upcoming Wells</h1>
        <p className="text-sm text-gray-600">Default sort: Need-by Soonest • Expiration Soonest</p>
      </header>
      <div className="space-y-4">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl border bg-white">
            <div className="p-4 grid grid-cols-3 gap-4">
              <div>
                <div className="text-lg font-semibold">{c.customer}</div>
                <div className="text-sm text-gray-700 mt-1">API: {c.api}</div>
              </div>
              <div>
                <div className="text-base">{c.county}</div>
                <div className="text-sm text-gray-600 mt-1">Need: {c.need}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold" style={{color:'#2f4f4f'}}>Priority</div>
                <div className="inline-flex px-3 py-1 rounded-xl bg-amber-500 text-white text-xs mt-2">Scheduled</div>
              </div>
            </div>
            <div className="border-t px-4 py-3 flex items-center gap-3">
              <button className="border border-gray-500 rounded-xl px-4 py-2">Assign Truck</button>
              <button className="rounded-xl px-4 py-2 text-white" style={{background:'#2f4f4f'}}>Add to My Day</button>
              <button className="rounded-xl px-4 py-2 text-white ml-auto" style={{background:'#C43D3D'}}>Defer</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
