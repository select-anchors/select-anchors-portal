// app/admin/users/page.js
"use client";

import { useEffect, useState } from "react";
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

export default function AdminUsersPage() {
  const { data: session, status } = useSession();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  async function loadUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users || []);
    setCompanies(data.companies || []);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      loadUsers();
    }
  }, [status]);

  async function onCreate(e) {
    e.preventDefault();

    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to create user");
      setCreating(false);
      return;
    }

    alert("User created successfully");

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
    setCreating(false);
  }

  async function manualReset(id) {
    const password = prompt("Enter a temporary password (min 8 chars):");

    if (!password) return;

    const res = await fetch(`/api/admin/users/${id}/reset`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to set password");
      return;
    }

    alert("Temporary password saved");
  }

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <NotLoggedIn />;
  if (!isAdmin) return <div>Not authorized</div>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Manage Users</h1>

      <form onSubmit={onCreate} className="border rounded-xl p-6 space-y-4">

        <input
          placeholder="Full name"
          className="border rounded px-3 py-2 w-full"
          value={form.name}
          onChange={(e)=>setForm(s=>({...s,name:e.target.value}))}
        />

        <input
          placeholder="Email"
          className="border rounded px-3 py-2 w-full"
          value={form.email}
          onChange={(e)=>setForm(s=>({...s,email:e.target.value}))}
        />

        <input
          placeholder="Phone"
          className="border rounded px-3 py-2 w-full"
          value={form.phone}
          onChange={(e)=>setForm(s=>({...s,phone:e.target.value}))}
        />

        <input
          placeholder="Company name"
          className="border rounded px-3 py-2 w-full"
          value={form.company_name}
          onChange={(e)=>setForm(s=>({...s,company_name:e.target.value}))}
        />

        <select
          className="border rounded px-3 py-2 w-full"
          value={form.role}
          onChange={(e)=>setForm(s=>({...s,role:e.target.value}))}
        >
          <option value="customer">Customer</option>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Temporary password (optional)"
          type="text"
          value={form.temporaryPassword}
          onChange={(e)=>
            setForm((s)=>({
              ...s,
              temporaryPassword:e.target.value
            }))
          }
        />

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={form.sendReset}
            onChange={(e)=>
              setForm(s=>({...s,sendReset:e.target.checked}))
            }
          />
          Send password setup email
        </label>

        <button
          disabled={creating}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {creating ? "Creating..." : "Create User"}
        </button>

      </form>

      <div className="space-y-2">

        {users.map((u)=>(
          <div key={u.id} className="border p-4 rounded flex justify-between">

            <div>
              <div>{u.name}</div>
              <div className="text-sm text-gray-500">{u.email}</div>
            </div>

            <button
              className="border px-3 py-1 rounded"
              onClick={()=>manualReset(u.id)}
            >
              Set Temp Password
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}
