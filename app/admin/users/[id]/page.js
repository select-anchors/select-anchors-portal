// /app/admin/users/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function ManageUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function load() {
      setError("");
      try {
        const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load user.");
        setUser(json.user);
      } catch (err) {
        setError(err.message || "Failed to load user.");
      }
    }

    if (session?.user?.role === "admin") {
      load();
    }
  }, [id, status, session?.user?.role]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }
  if (!user) {
    return <div className="container py-8">Loading user…</div>;
  }

  function upd(field, value) {
    setUser((prev) => ({ ...prev, [field]: value }));
  }

  async function saveUser() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          phone: user.phone,
          company_name: user.company_name,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save user.");
      setMsg("User updated.");
    } catch (err) {
      setError(err.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function sendReset() {
    setMsg("");
    setError("");
    const res = await fetch(`/api/admin/users/${id}/send-reset`, {
      method: "POST",
    });
    if (res.ok) setMsg("Reset email sent.");
    else setError("Could not send reset.");
  }

  async function remove() {
    if (!confirm("Delete this user?")) return;
    setMsg("");
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/users");
    } else {
      setError("Delete failed.");
    }
  }

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Manage user</h1>
        <button
          className="px-3 py-2 rounded-xl border"
          onClick={() => router.push("/admin/users")}
        >
          Back
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={user.name || ""}
            onChange={(e) => upd("name", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2"
            value={user.email || ""}
            onChange={(e) => upd("email", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Cell phone</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={user.phone || ""}
            onChange={(e) => upd("phone", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Company name
          </label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={user.company_name || ""}
            onChange={(e) => upd("company_name", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Role</label>
            <select
              className="border rounded px-3 py-2"
              value={user.role || "customer"}
              onChange={(e) => upd("role", e.target.value)}
            >
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!user.is_active}
              onChange={(e) => upd("is_active", e.target.checked)}
            />
            Active
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={saveUser}
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            onClick={sendReset}
            className="px-3 py-2 rounded-xl border"
          >
            Send password reset
          </button>

          <button
            onClick={remove}
            className="px-3 py-2 rounded-xl border border-red-600 text-red-600"
          >
            Delete user
          </button>
        </div>
      </div>
    </div>
  );
}
