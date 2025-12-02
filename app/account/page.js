// /app/account/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load account.");

        setForm({
          name: json.user.name || "",
          email: json.user.email || "",
          phone: json.user.phone || "",
          company_name: json.user.company_name || "",
        });
      } catch (err) {
        setError(err.message || "Failed to load account.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status]);

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  function upd(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save changes.");
      setMsg("Account updated.");
    } catch (err) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      {loading ? (
        <div>Loading account…</div>
      ) : (
        <form onSubmit={onSubmit} className="bg-white border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={form.name}
              onChange={(e) => upd("name", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2"
              value={form.email}
              onChange={(e) => upd("email", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Cell phone</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={form.phone}
              onChange={(e) => upd("phone", e.target.value)}
              placeholder="e.g. 555-555-5555"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Company</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-gray-50"
              value={form.company_name}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              If this company is wrong, contact Select Anchors to update it.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
    </div>
  );
}
