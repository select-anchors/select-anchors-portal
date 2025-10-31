// app/admin/users/page.js
import Link from "next/link";

async function fetchUsers() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/users`, { cache: "no-store" });
  if (!res.ok) return { users: [] };
  return res.json();
}

export default async function UsersPage() {
  const { users } = await fetchUsers();

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link
          href="/admin/users/new"
          className="rounded-xl px-4 py-2 bg-[#2f4f4f] text-white"
        >
          Create user
        </Link>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Link href={`/admin/users/${u.id}`} className="underline">Manage</Link>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td className="p-6 text-gray-500" colSpan={4}>No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
