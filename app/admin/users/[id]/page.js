// app/admin/users/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminUserDetailPage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    is_active: true,
  });

  // Auth checks
  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  if (session.user.role !== "admin") {
    return <div className="container py-8">Not authorized.</div>;
  }

  // Load user details
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/admin/users/${userId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed to load user.");
        }
        const u = await res.json();
        if (!mounted) return;

        setForm({
          name: u.name || "",
          email: u.email || "",
          role: u.role || "",
          is_active: !!u.is_active,
        });
      } catch (err) {
        console.error("Error loading user:", err);
        if (mounted) setError(err.message || "Failed to load user.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  function updateField(field) {
    return (e) => {
      const value =
        field === "is_active" ? e.target.checked : e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(j.error || "Failed to save changes.");
      }

      setSuccess("User updated successfully.");
      // If you want to go back to the list after save:
      // router.push("/admin/users");
    } catch (err) {
      console.error("Error saving user:", err);
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="container py-8">Loading user…</div>;
  }

  if (error && !form.email && !form.name) {
    // Hard failure state
    return (
      <div className="container py-8 space-y-4">
        <h1 className="text-2xl font-bold">User</h1>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
        <Link href="/admin/users" className="underline text-[#2f4f4f]">
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit User</h1>
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm"
        >
          All Users
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-2xl shadow-sm p-6 space-y-5"
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <input
            className="w-full"
            value={form.name}
            onChange={updateField("name")}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            className="w-full"
            value={form.email}
            onChange={updateField("email")}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Role</label>
          <select
            className="w-full"
            value={form.role}
            onChange={updateField("role")}
          >
            <option value="">Select role…</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={updateField("is_active")}
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Active
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
