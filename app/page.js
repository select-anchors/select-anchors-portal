import Link from 'next/link';

export default function Home() {
  return (
    <main style={{maxWidth:'72rem',margin:'0 auto',padding:'1.5rem'}}>
      <h1 className="text-2xl font-bold">Select Anchors — Portal</h1>
      <ul className="list-disc list-inside" style={{color:'#1d4ed8', textDecoration:'underline', marginTop:'12px'}}>
        <li><Link href="/login">Login</Link></li>
        <li><Link href="/dashboard">Dispatcher Dashboard</Link></li>
        <li><Link href="/driver/my-day">Driver — My Day</Link></li>
        <li><Link href="/wells/30-015-54321">Well Detail demo</Link></li>
      </ul>
    </main>
  );
}
