import Link from "next/link";

export default function Home() {
  return (
    <div className="container space-y-6">
      <section className="card">
        <div className="card-section">
          <h1 className="font-display text-2xl">SELECT ANCHORS</h1>
          <p className="text-gray-600 mt-2">Oilfield anchor installation & testing • Hole drilling</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">Client Login</Link>
            <Link href="/dashboard" className="btn btn-secondary">Dispatcher Dashboard</Link>
            <Link href="/driver/my-day" className="btn btn-secondary">Driver — My Day</Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card"><div className="card-section"><h3 className="font-semibold">Testing</h3><p className="text-sm text-gray-600 mt-1">Anchors tested to 23,500 lbs with tagging & 2-year compliance tracking.</p></div></div>
        <div className="card"><div className="card-section"><h3 className="font-semibold">Installation</h3><p className="text-sm text-gray-600 mt-1">Four-corner installs with precise GPS for each anchor.</p></div></div>
        <div className="card"><div className="card-section"><h3 className="font-semibold">Records</h3><p className="text-sm text-gray-600 mt-1">Client portal shows wells, expirations, PDFs, and map routes.</p></div></div>
      </section>
    </div>
  );
}
