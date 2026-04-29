// app/company/users/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { hasPermission, resolvePermissions } from "../../../lib/permissions";

const PERMISSION_LABELS = {
  can_view_all_company_wells: "View Company Wells",
  can_edit_company_contacts: "Edit Contacts",
  can_export_csv: "Export CSV",
  can_manage_company_users: "Manage Company Users",
  can_edit_company_users: "Edit Company Users",
  can_reset_company_passwords: "Reset Company Passwords",
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

export default function CompanyUsersPage() {
  const { data: session, status } = useSession();

  const [users, setUsers] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    permissions_json: {
      can_view_all_company_wells: true,
      can_edit_company_contacts: false,
      can_export_csv: false,
      can_manage_company_users: false,
      can_edit_company_users: false,
      can_reset_company_passwords: false,
    },
  });

  const canViewCompanyUsers =
    !!session &&
    (hasPermission(session, "can_manage_company_users") ||
      hasPermission(session, "can_edit_company_users"));

  const canRequestCompanyUsers =
    !!session && hasPermission(session, "can_manage_company_users");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/company/users", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load company users.");
      }

      setUsers(Array.isArray(json?.users) ? json.users : []);
      setCompanyName(json?.company_name || "");
    } catch (err) {
      console.error("Company users load failed:", err);
      setUsers([]);
      setError(err?.message || "Failed to load company users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && canViewCompanyUsers) {
      loadUsers();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, canViewCompanyUsers]);

  function updatePermission(key) {
    setForm((prev) => ({
      ...prev,
      permissions_json: {
        ...prev.permissions_json,
        [key]: !prev.permissions_json[key],
      },
    }));
  }

  async function submitRequest(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/company/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit user request.");
      }

      setForm({
        name: "",
        email: "",
        phone: "",
        permissions_json: {
          can_view_all_company_wells: true,
          can_edit_company_contacts: false,
          can_export_csv: false,
          can_manage_company_users: false,
          can_edit_company_users: false,
          can_reset_company_passwords: false,
        },
      });

      setSuccess("User request submitted for Select Anchors approval.");
    } catch (err) {
      console.error("Company user request failed:", err);
      setError(err?.message || "Failed to submit user request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  if (!canViewCompanyUsers) {
    return (
      <div className="container py-8">
        Not authorized. Please contact Select Anchors if you need access to company users.
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Company Users</h1>
        <p className="text-sm text-gray-600">
          {companyName || session.user?.company_name || "Your company"} user access.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {canRequestCompanyUsers && (
        <form
          onSubmit={submitRequest}
          className="bg-white border rounded-2xl p-6 space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold">Request New Company User</h2>
            <p className="text-sm text-gray-600">
              This request will be sent to Select Anchors for approval before the user is created.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
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
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Requested Permissions</div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!!form.permissions_json[key]}
                    onChange={() => updatePermission(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit User Request"}
          </button>
        </form>
      )}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold">
          Existing Company Users
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No company users found.</div>
        ) : (
          <div className="divide-y">
            {users.map((u) => {
              const perms = resolvePermissions(
                u.role,
                null,
                u.permissions_json || null
              );

              return (
                <div key={u.id} className="p-6 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="font-semibold">{u.name || "Unnamed User"}</div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                      <div className="text-sm text-gray-500">
                        {u.phone || "No phone"} · {u.role}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {u.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <PermissionBadge
                        key={key}
                        label={label}
                        enabled={!!perms[key]}
                      />
                    ))}
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
