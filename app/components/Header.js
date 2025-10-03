"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const base = "pb-1 hover:opacity-80";
  const active = "border-b-2 border-brand-green font-semibold";
  return (
    <Link href={href} className={`${base} ${isActive ? active : ""}`}>
      {children}
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
  <div className="h-8 w-8 rounded-lg bg-brand-green/90 flex items-center justify-center text-white font-bold">SA</div>
  <div className="tracking-wide text-xl font-bold">SELECT ANCHORS</div>
</Link>

       <nav className="hidden md:flex items-center gap-6">
  <NavLink href="/dashboard">Dashboard</NavLink>
  <NavLink href="/driver/my-day">My Day</NavLink>
  <NavLink href="/wells/30-015-54321">Well Detail</NavLink>
  <NavLink href="/account">Account</NavLink>
  <Link href="/login" className="btn btn-secondary">Client Login</Link>
</nav>
        <button className="md:hidden p-2 rounded-lg border border-gray-300" onClick={()=>setOpen(v=>!v)} aria-label="Open menu">
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black mb-1"></div>
          <div className="w-5 h-[2px] bg-black"></div>
        </button>
      </div>

      {/* mobile menu */}
      {open && (
  <div className="md:hidden border-t border-gray-200">
    <div className="container py-3 flex flex-col gap-3">
      <Link href="/dashboard" onClick={()=>setOpen(false)}>Dashboard</Link>
      <Link href="/driver/my-day" onClick={()=>setOpen(false)}>My Day</Link>
      <Link href="/wells/30-015-54321" onClick={()=>setOpen(false)}>Well Detail</Link>
      <Link href="/account" onClick={()=>setOpen(false)}>Account</Link>
      <Link href="/login" className="btn btn-secondary w-fit" onClick={()=>setOpen(false)}>Client Login</Link>
    </div>
  </div>
)}
    </header>
  );
}
