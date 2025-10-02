
export default function WellDetail() {
  const anchors = [1,2,3,4];
  return (
    <div className="container space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Well Detail — Rivera 7 — Unit A</h1>
        <p className="text-sm text-gray-600">API 30-015-54321 • Select Demo Energy • Eddy, NM</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="card h-64 flex items-center justify-center">Google Map</div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button className="btn btn-primary">Open in WSN</button>
            <button className="btn btn-primary">Open Route in WSN</button>
            <button className="btn btn-secondary">Open in Google Maps</button>
            <button className="btn btn-secondary">Open in Apple Maps</button>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-700 mb-2">Anchors • GPS & Next Due</div>
          <div className="space-y-2">
            {anchors.map(n => (
              <div key={n} className="card p-3">
                <div className="text-xs text-gray-500">Anchor {n}</div>
                <div className="text-sm">GPS: 32.7123, -103.1456</div>
                <div className="text-sm">Next due: 2025-12-01</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
