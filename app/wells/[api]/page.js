export default function WellDetail() {
  const anchors = [1,2,3,4];
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Well Detail — Rivera 7 — Unit A</h1>
        <p className="text-sm text-gray-600">API 30-015-54321 • Select Demo Energy • Eddy, NM</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="rounded-xl border h-64 flex items-center justify-center bg-white">Google Map</div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button className="rounded-xl px-4 py-2 text-white" style={{background:'#2f4f4f'}}>Open in WSN</button>
            <button className="rounded-xl px-4 py-2 text-white" style={{background:'#2f4f4f'}}>Open Route in WSN</button>
            <button className="border border-gray-500 rounded-xl px-4 py-2">Open in Google Maps</button>
            <button className="border border-gray-500 rounded-xl px-4 py-2">Open in Apple Maps</button>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-700 mb-2">Anchors • GPS & Next Due</div>
          <div className="space-y-2">
            {anchors.map(n => (
              <div key={n} className="rounded-xl border p-3 bg-white">
                <div className="text-xs text-gray-500">Anchor {n}</div>
                <div className="text-sm">GPS: 32.7123, -103.1456</div>
                <div className="text-sm">Next due: 2025-12-01</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
