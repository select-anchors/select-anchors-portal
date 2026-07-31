// app/admin/users/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { resolvePermissions, getDefaultPermissions } from "../../../lib/permissions";

const PERMISSION_LABELS = {
  can_view_all_wells: "View All Wells",
  can_view_all_company_wells: "View Company Wells",
  can_edit_wells: "Edit Wells",
  can_bulk_edit_wells: "Bulk Edit",
  can_edit_company_contacts: "Edit Contacts",
  can_export_csv: "Export CSV",
  can_transfer_well_ownership: "Transfer Ownership",
  can_manage_users: "Manage Users",
  can_manage_company_users: "Manage Company Users",
  can_edit_company_users: "Edit Company Users",
  can_reset_passwords: "Reset Passwords",
  can_reset_company_passwords: "Reset Company Passwords",
  can_manage_items_pricing: "Items & Pricing",
  can_approve_changes: "Approve Changes",
  can_use_dispatch: "Dispatch",
};

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

function formatActivityDate(value) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
}

function userHasLoggedIn(user) {
  return !!user.first_login_at || Number(user.login_count || 0) > 0;
}

function userHasBeenInvited(user) {
  return !!user.invited_at;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
const [searchQuery, setSearchQuery] = useState("");
const [companyFilter, setCompanyFilter] = useState("");
const [roleFilter, setRoleFilter] = useState("");
const [activeFilter, setActiveFilter] = useState("");
const [loginFilter, setLoginFilter] = useState("");
const [inviteFilter, setInviteFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [editRole, setEditRole] = useState("customer");
  const [editPermissions, setEditPermissions] = useState({});
  const [editCompanyId, setEditCompanyId] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    role: "customer",
    sendReset: true,
    temporaryPassword: "",
  });

  const role = session?.user?.role;
  const isAdmin = role === "admin";

  async function toggleUserActive(id, email, nextActive) {
  const ok = confirm(
    `${nextActive ? "Reactivate" : "Deactivate"} this user?\n\n${email || ""}`
  );

  if (!ok) return;

  try {
    const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: nextActive }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json?.error || "Failed to update user");
      return;
    }

    await loadUsers();
    alert(nextActive ? "User reactivated" : "User deactivated");
  } catch (err) {
    console.error(err);
    alert("Error updating user");
  }
}
  
  async function deleteUser(id, email) {
  const ok = confirm(
    `Delete/deactivate this user?\n\n${email || ""}\n\nThey will no longer be able to log in.`
  );

  if (!ok) return;

  try {
    const res = await fetch(`/api/admin/users/${id}/delete`, {
      method: "POST",
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json?.error || "Failed to delete user");
      return;
    }

    await loadUsers();
    alert("User deleted/deactivated");
  } catch (err) {
    console.error(err);
    alert("Error deleting user");
  }
}
  
  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Failed to load users (${res.status})`);
      }

      setUsers(Array.isArray(data?.users) ? data.users : []);
      setCompanies(Array.isArray(data?.companies) ? data.companies : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setUsers([]);
      setCompanies([]);
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

  const filteredUsers = useMemo(() => {
  const query = searchQuery.trim().toLowerCase();

  return users.filter((user) => {
    if (query) {
      const searchable = [
        user.name,
        user.email,
        user.phone,
        user.company_name,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    if (
      companyFilter &&
      String(user.company_id || "") !== companyFilter
    ) {
      return false;
    }

    if (roleFilter && user.role !== roleFilter) {
      return false;
    }

    if (activeFilter === "active" && user.is_active !== true) {
      return false;
    }

    if (activeFilter === "inactive" && user.is_active !== false) {
      return false;
    }

    if (loginFilter === "logged_in" && !userHasLoggedIn(user)) {
      return false;
    }

    if (loginFilter === "never_logged_in" && userHasLoggedIn(user)) {
      return false;
    }

    if (inviteFilter === "invited" && !userHasBeenInvited(user)) {
      return false;
    }

    if (inviteFilter === "not_invited" && userHasBeenInvited(user)) {
      return false;
    }

    return true;
  });
}, [
  users,
  searchQuery,
  companyFilter,
  roleFilter,
  activeFilter,
  loginFilter,
  inviteFilter,
]);

  function clearUserFilters() {
  setSearchQuery("");
  setCompanyFilter("");
  setRoleFilter("");
  setActiveFilter("");
  setLoginFilter("");
  setInviteFilter("");
}
  
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
        temporaryPassword: "",
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

  function startEditingUser(user) {
    setEditingUserId(user.id);
    setEditRole(user.role);
    setEditCompanyId(user.company_id || "");
    setEditPermissions(
      resolvePermissions(
        user.role,
        user.company_permissions_json || null,
        user.permissions_json || null
      )
    );
  }

  function cancelEditingUser() {
    setEditingUserId("");
    setEditRole("customer");
    setEditCompanyId("");
    setEditPermissions({});
  }

  function onEditRoleChange(nextRole) {
    setEditRole(nextRole);
    setEditPermissions(getDefaultPermissions(nextRole));
  }

  function togglePermission(key) {
    setEditPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function saveUserAccess(userId) {
    try {
      setSavingId(userId);

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          company_id: editCompanyId || null,
          permissions_json: editPermissions,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json?.error || "Failed to save access controls");
        return;
      }

      await loadUsers();
      cancelEditingUser();
      alert("Access controls updated");
    } catch (err) {
      console.error(err);
      alert("Error saving access controls");
    } finally {
      setSavingId("");
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
            placeholder="Company name (creates or links company)"
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
            placeholder="Temporary password optional"
            type="text"
            value={form.temporaryPassword}
            onChange={(e) =>
              setForm((s) => ({ ...s, temporaryPassword: e.target.value }))
            }
          />

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
          Role = base access. Company = ownership/scope. User access edits below are per-user overrides.
        </div>

        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create User"}
        </button>
      </form>

          <div className="bg-white border rounded-2xl p-6 space-y-4">
  <div>
    <h2 className="text-lg font-semibold">Search & Filter Users</h2>
    <p className="text-sm text-gray-600 mt-1">
      Search by user, email, phone, company, or role.
    </p>
  </div>

  <input
    className="w-full rounded-xl border px-3 py-2"
    placeholder="Search by name, email, phone, company, or role…"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
    <select
      className="w-full rounded-xl border px-3 py-2"
      value={companyFilter}
      onChange={(e) => setCompanyFilter(e.target.value)}
    >
      <option value="">All Companies</option>

      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>

    <select
      className="w-full rounded-xl border px-3 py-2"
      value={roleFilter}
      onChange={(e) => setRoleFilter(e.target.value)}
    >
      <option value="">All Roles</option>
      <option value="customer">Customer</option>
      <option value="employee">Employee</option>
      <option value="admin">Admin</option>
    </select>

    <select
      className="w-full rounded-xl border px-3 py-2"
      value={activeFilter}
      onChange={(e) => setActiveFilter(e.target.value)}
    >
      <option value="">All Statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>

    <select
      className="w-full rounded-xl border px-3 py-2"
      value={loginFilter}
      onChange={(e) => setLoginFilter(e.target.value)}
    >
      <option value="">All Login Activity</option>
      <option value="logged_in">Has Logged In</option>
      <option value="never_logged_in">Never Logged In</option>
    </select>

    <select
      className="w-full rounded-xl border px-3 py-2"
      value={inviteFilter}
      onChange={(e) => setInviteFilter(e.target.value)}
    >
      <option value="">All Invite Statuses</option>
      <option value="invited">Invite Sent</option>
      <option value="not_invited">Invite Not Sent</option>
    </select>
  </div>

  <div className="flex items-center gap-3 flex-wrap">
    <button
      type="button"
      onClick={clearUserFilters}
      className="rounded-xl border px-4 py-2 hover:bg-gray-50"
    >
      Clear Filters
    </button>

    <div className="text-sm text-gray-600">
      Showing{" "}
      <span className="font-semibold">{filteredUsers.length}</span>{" "}
      of <span className="font-semibold">{users.length}</span> users
    </div>
  </div>
</div>
          
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold">Existing Users</div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No users found.</div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((u) => {
              const perms = resolvePermissions(
                u.role,
                u.company_permissions_json || null,
                u.permissions_json || null
              );
              const isEditing = editingUserId === u.id;

              return (
                <div key={u.id} className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-semibold">{u.name || "Unnamed User"}</div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                      <div className="text-sm text-gray-600">
                        {u.company_name || "No company"} · {u.role}
                        <div
  className={`text-xs font-medium ${
    u.is_active ? "text-green-700" : "text-red-700"
  }`}
>
  {u.is_active ? "Active" : "Inactive"}
</div>
                      </div>
                      {u.phone && (
  <div className="text-sm text-gray-500">{u.phone}</div>
)}

<div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-500">
  <div>
    Invite sent:{" "}
    <span className="font-medium text-gray-700">
      {formatActivityDate(u.invited_at)}
    </span>
  </div>

  <div>
    First login:{" "}
    <span className="font-medium text-gray-700">
      {formatActivityDate(u.first_login_at)}
    </span>
  </div>

  <div>
    Last login:{" "}
    <span className="font-medium text-gray-700">
      {formatActivityDate(u.last_login_at)}
    </span>
  </div>

  <div>
    Login count:{" "}
    <span className="font-medium text-gray-700">
      {u.login_count || 0}
    </span>
  </div>

  <div>
    Last seen:{" "}
    <span className="font-medium text-gray-700">
      {formatActivityDate(u.last_seen_at)}
    </span>
  </div>
</div>
</div>

<div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditingUser(u)}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Edit User Override
                      </button>

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

<button
  onClick={() => toggleUserActive(u.id, u.email, !u.is_active)}
  className={`rounded-xl border px-3 py-2 text-sm ${
    u.is_active
      ? "border-red-300 text-red-700 hover:bg-red-50"
      : "border-green-300 text-green-700 hover:bg-green-50"
  }`}
>
  {u.is_active ? "Deactivate" : "Reactivate"}
</button>
    
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">
                        Resolved Access
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                          <PermissionBadge
                            key={key}
                            label={label}
                            enabled={perms[key]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="border rounded-2xl p-4 bg-gray-50 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Role
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => onEditRoleChange(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="customer">Customer</option>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Company
                          </label>
                          <select
                            value={editCompanyId}
                            onChange={(e) => setEditCompanyId(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="">No company assigned</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        These checkboxes are per-user overrides. Later, we can add company-level access templates on top of this.
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">
                          User Override Permissions
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={!!editPermissions[key]}
                                onChange={() => togglePermission(key)}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveUserAccess(u.id)}
                          disabled={savingId === u.id}
                          className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
                        >
                          {savingId === u.id ? "Saving..." : "Save User Override"}
                        </button>

                        <button
                          onClick={cancelEditingUser}
                          className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
