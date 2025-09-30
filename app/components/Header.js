import Link from "next/link";

export default function Header(){
  return (
    <header className="border-b" style={{borderColor:"var(--line)"}}>
      <div className="container flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-3">
          {/* Optional: swap for your SVG mark later */}
          <div className="h-6 w-6 rounded-full" style={{background:"var(--brand-green)"}} />
          <span className="h2 text-xl" style={{fontFamily:"Norwester"}}>SELECT ANCHORS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 body">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/driver/my-day" className="hover:underline">My Day</Link>
          <Link href="/wells/30-015-54321" className="hover:underline">Wells</Link>
          <Link href="/login" className="btn btn-primary">Client Login</Link>
        </nav>
      </div>
    </header>
  );
}
