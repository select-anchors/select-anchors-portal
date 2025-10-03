// Simple data loader – swap with real data later.
function getWellData(api) {
  return {
    name: "Rivera 7 — Unit A",
    api,
    customer: "Select Demo Energy",
    county: "Eddy, NM",
    wsnWellUrl: "https://branch.wellsitenavigator.com/YDcKbFPG7Vb",   // Well link
    wsnRouteUrl: "",                                                    // Leave empty to HIDE "Open Route in WSN"
    googleMapsUrl: "https://maps.google.com/?q=32.7123,-103.1456",
    appleMapsUrl: "http://maps.apple.com/?ll=32.7123,-103.1456",
    anchors: [
      { id: 1, gps: "32.7123, -103.1456", nextDue: "2025-12-01" },
      { id: 2, gps: "32.7125, -103.1452", nextDue: "2025-12-01" },
      { id: 3, gps: "32.7128, -103.1459", nextDue: "2025-12-01" },
      { id: 4, gps: "32.7130, -103.1462", nextDue: "2025-12-01" },
    ],
  };
}

export default function WellDetail({ params }) {
  const api = decodeURIComponent(params.api || "30-015-54321");
  const well = getWellData(api);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold">Well Detail — {well.name}</h1>
        <p className="text-sm text-gray-600">
          API {well.api} • {well.customer} • {well.county}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Map & buttons */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 flex items-center justify-center text-gray-500">
            Google Map (placeholder)
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* White-outline buttons that keep dark text on hover */}
            <a
              href={well.wsnWellUrl}
              target="_blank"
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800 text-center"
            >
              Open in WSN
            </a>

            {well.wsnRouteUrl && (
              <a
                href={well.wsnRouteUrl}
                target="_blank"
                className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800 text-center"
              >
                Open Route in WSN
              </a>
            )}

            <a
              href={well.googleMapsUrl}
              target="_blank"
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800 text-center"
            >
              Open in Google Maps
            </a>

            <a
              href={well.appleMapsUrl}
              target="_blank"
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800 text-center"
            >
              Open in Apple Maps
            </a>
          </div>
        </section>

        {/* Right: Anchors list (vertical, no bleed) */}
        <section>
          <div className="text-sm text-gray-700 mb-2">
            Anchors • GPS &amp; Next Due
          </div>

          <div className="space-y-3">
            {well.anchors.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-xs text-gray-500">Anchor {a.id}</div>
                <div className="text-sm mt-1">GPS: {a.gps}</div>
                <div className="text-sm">Next due: {a.nextDue}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
