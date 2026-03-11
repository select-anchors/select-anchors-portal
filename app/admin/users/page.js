// app/admin/users/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
<<<<<<< Updated upstream
=======
import NotLoggedIn from "../../../app/components/NotLoggedIn";
>>>>>>> Stashed changes

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    role: "customer",
    password: "",
  });

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Failed to create user");
        return;
      }

      setForm({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        role: "customer",
        password: "",
      });

      await loadUsers();
      alert("User created successfully");
    } catch (err) {
      console.error(err);
      alert("Error creating user");
    } finally {
      setCreating(false);
    }
  }

  async function sendReset(id) {
    const ok = confirm("Send password reset email to this user?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}/send-reset`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Failed to send reset email");
        return;
      }
      alert("Password reset email sent");
    } catch (err) {
      console.error(err);
      alert("Error sending reset email");
    }
  }

  async function manualReset(id) {
    const password = prompt("Enter a new temporary password for this user:");
    if (!password) return;

    try {
      const res = await fetch(`/api/admin/users/${id}/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Failed to reset password");
        return;
      }
      alert("Password updated successfully");
    } catch (err) {
      console.error(err);
      alert("Error resetting password");
    }
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <Link
          href="/dashboard"
          className="rounded-xl border px-4 py-2 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <form
        onSubmit={onCreate}
        className="bg-white border rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">Create New User</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) =>
              setForm((s) => ({ ...s, company_name: e.target.value }))
            }
          />

          <select
            className="border rounded-lg px-3 py-2"
            value={form.role}
            onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
          >
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>

          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({ ...s, password: e.target.value }))
            }
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold">Existing Users</div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No users found.</div>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-semibold">{u.name || "Unnamed User"}</div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                  <div className="text-sm text-gray-600">
                    {u.company_name || "No company"} · {u.role}
                  </div>
                  {u.phone && (
                    <div className="text-sm text-gray-500">{u.phone}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => sendReset(u.id)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Email Reset
                  </button>
                  <button
                    onClick={() => manualReset(u.id)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Set Temp Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
