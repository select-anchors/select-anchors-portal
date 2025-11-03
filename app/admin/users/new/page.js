"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function AdminUsersNew() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "employee",
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function upd(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to create user");
      setMsg("User created. Password reset email sent if configured.");
      setForm({ name: "", email: "", role: "employee" });
    } catch (e2) {
      setMsg(e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session) return <div className="p-8">Please log in.</div>;
  if (session.user.role !== "admin") return <div className="p-8">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">New User</h1>
      {msg && <div className="text-sm">{msg}</div>}

      <form onSubmit={submit} className="max-w-lg space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600">Name</div>
          <input value={form.name} onChange={(e)=>upd("name", e.target.value)} className="w-full" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Email</div>
          <input value={form.email} onChange={(e)=>upd("email", e.target.value)} className="w-full" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Role</div>
          <select value={form.role} onChange={(e)=>upd("role", e.target.value)} className="w-full">
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
          </select>
        </label>

        <button
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          {saving ? "Creating…" : "Create User"}
        </button>
      </form>
    </div>
  );
}
