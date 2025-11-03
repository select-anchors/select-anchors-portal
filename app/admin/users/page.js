"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
    if (session && !isAdmin) router.replace("/dashboard");
  }, [session, status, isAdmin, router]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session && isAdmin) load();
  }, [session, isAdmin]);

  async function saveUser(u) {
    setSavingId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: u.name,
          email: u.email,
          role: u.role,
          is_active: u.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function sendReset(u) {
    setSavingId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not send reset");
      alert("Reset email sent (if SMTP is configured).");
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeUser(u) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    setSavingId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  if (status === "loading" || loading) {
    return <div className="container py-10">Loading…</div>;
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <a
          href="/admin/users/new"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New User
        </a>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="overflow-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Active</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={u.name || ""}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x.id === u.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={u.email}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x.id === u.id ? { ...x, email: e.target.value } : x))
                      )
                    }
                  />
                </td>
                <td className="p-3">
                  <select
                    className="border rounded px-2 py-1"
                    value={u.role}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x.id === u.id ? { ...x, role: e.target.value } : x))
                      )
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="employee">employee</option>
                    <option value="customer">customer</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={!!u.is_active}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x.id === u.id ? { ...x, is_active: e.target.checked } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 space-x-2">
                  <button
                    disabled={savingId === u.id}
                    onClick={() => saveUser(u)}
                    className="px-3 py-1 rounded border"
                  >
                    {savingId === u.id ? "Saving…" : "Save"}
                  </button>
                  <button
                    disabled={savingId === u.id}
                    onClick={() => sendReset(u)}
                    className="px-3 py-1 rounded border"
                  >
                    Send Reset
                  </button>
                  <button
                    disabled={savingId === u.id}
                    onClick={() => removeUser(u)}
                    className="px-3 py-1 rounded border text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
