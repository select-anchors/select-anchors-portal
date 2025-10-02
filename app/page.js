
import Link from "next/link";
export default function Home() {
  return (
    <div className="container space-y-6">
      <section className="card">
        <div className="card-section">
          <h1 className="text-2xl font-bold">SELECT ANCHORS</h1>
          <p className="text-gray-600 mt-2">Oilfield anchor installation & testing • Hole drilling</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">Client Login</Link>
            <Link href="/dashboard" className="btn btn-secondary">Dispatcher Dashboard</Link>
            <Link href="/driver/my-day" className="btn btn-secondary">Driver — My Day</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
