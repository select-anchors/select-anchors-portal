"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sendingId, setSendingId] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || "Failed to load users.");
      }
      setUsers(j.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && session.user.role === "admin") {
      loadUsers();
    }
  }, [status, session?.user?.role]);

  async function sendReset(id) {
    setMsg("");
    setError("");
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/send-reset`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || "Failed to send reset email.");
      }
      setMsg("Reset email sent.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSendingId(null);
    }
  }

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New User
        </Link>
      </div>

      {msg && <div className="text-sm text-green-700">{msg}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={6}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="underline hover:no-underline"
                    >
                      {u.name || "—"}
                    </Link>
                  </td>
                  <td className="p-3 break-all">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    {u.is_active ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="px-3 py-1 rounded-xl border border-gray-400 text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => sendReset(u.id)}
                        disabled={sendingId === u.id}
                        className="px-3 py-1 rounded-xl border border-blue-600 text-blue-700 text-xs disabled:opacity-60"
                      >
                        {sendingId === u.id ? "Sending…" : "Send reset email"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
