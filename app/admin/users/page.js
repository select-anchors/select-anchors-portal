"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { resolvePermissions } from "../../../lib/permissions";

function PermissionBadge({ label, enabled }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
        enabled
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {label}: {enabled ? "Yes" : "No"}
    </span>
  );
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    role: "customer",
    sendReset: true,
  });

  const role = session?.user?.role;
  const isAdmin = role === "admin";

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Failed to load users (${res.status})`);
      }

      setUsers(Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setUsers([]);
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      loadUsers();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, isAdmin]);

  async function onCreate(e) {
    e.preventDefault();
    try {
      setCreating(true);
      setError("");

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
        sendReset: true,
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

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!isAdmin) return <div className="container py-8">Not authorized.</div>;

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

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

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

          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input
              type="checkbox"
              checked={form.sendReset}
              onChange={(e) =>
                setForm((s) => ({ ...s, sendReset: e.target.checked }))
              }
            />
            <span className="text-sm">Send password setup email</span>
          </label>
        </div>

        <div className="text-xs text-gray-500">
          New users will be created with the default access for their selected role.
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
            {users.map((u) => {
              const perms = resolvePermissions(u.role, u.permissions_json || null);

              return (
                <div
                  key={u.id}
                  className="p-6 flex flex-col gap-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Access & Controls</div>
                    <div className="flex flex-wrap gap-2">
                      <PermissionBadge label="View All Wells" enabled={perms.can_view_all_wells} />
                      <PermissionBadge label="Edit Wells" enabled={perms.can_edit_wells} />
                      <PermissionBadge label="Bulk Edit" enabled={perms.can_bulk_edit_wells} />
                      <PermissionBadge label="Edit Contacts" enabled={perms.can_edit_company_contacts} />
                      <PermissionBadge label="Export CSV" enabled={perms.can_export_csv} />
                      <PermissionBadge label="Transfer Ownership" enabled={perms.can_transfer_well_ownership} />
                      <PermissionBadge label="Manage Users" enabled={perms.can_manage_users} />
                      <PermissionBadge label="Reset Passwords" enabled={perms.can_reset_passwords} />
                      <PermissionBadge label="Items & Pricing" enabled={perms.can_manage_items_pricing} />
                      <PermissionBadge label="Approve Changes" enabled={perms.can_approve_changes} />
                      <PermissionBadge label="Dispatch" enabled={perms.can_use_dispatch} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
