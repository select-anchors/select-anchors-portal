import Link from "next/link";

const cards = [
  { href: "/admin/wells", label: "All Wells", desc: "Browse and search approved wells." },
  { href: "/admin/wells/new", label: "New Well", desc: "Create a new well (goes to Pending)." },
  { href: "/driver/my-day", label: "My Day", desc: "Driver schedule & today’s tasks." },
  { href: "/account", label: "Account", desc: "Profile & settings." },
];

export default function Dashboard() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-gray-200 hover:border-gray-300 shadow-sm p-5 transition bg-white"
          >
            <div className="text-lg font-semibold mb-1">{c.label}</div>
            <div className="text-sm text-gray-600">{c.desc}</div>
          </Link>
        ))}
      </div>

      {/* You can add a “Recent Activity” or “Pending Approvals” section later */}
    </div>
  );
}
