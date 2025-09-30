import Link from "next/link";

export default function Home(){
  return (
    <section className="space-y-6">
      <h1 className="h1 text-3xl">Operational Portal</h1>
      <p className="text-[15px]" style={{color:"var(--muted)"}}>
        Fast access to wells, routes, and tests. Use the links below or the header.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard" className="card hover:shadow-sm">
          <div className="card-body">
            <div className="h2 text-lg mb-1">Dispatcher Dashboard</div>
            <div className="text-sm" style={{color:"var(--muted)"}}>Sort by need-by & expiration.</div>
          </div>
        </Link>
        <Link href="/driver/my-day" className="card hover:shadow-sm">
          <div className="card-body">
            <div className="h2 text-lg mb-1">Driver — My Day</div>
            <div className="text-sm" style={{color:"var(--muted)"}}>Route from Lovington yard.</div>
          </div>
        </Link>
        <Link href="/wells/30-015-54321" className="card hover:shadow-sm">
          <div className="card-body">
            <div className="h2 text-lg mb-1">Well Detail (Demo)</div>
            <div className="text-sm" style={{color:"var(--muted)"}}>Anchors, GPS, next due.</div>
          </div>
        </Link>
      </div>
    </section>
  );
}
