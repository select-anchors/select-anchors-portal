"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ItemsPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ code: "", name: "", unit: "", price: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isAdmin = session?.user?.role === "admin";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/items", { cache: "no-store" });
      const j = res.ok ? await res.json() : { items: [] };
      setItems(j.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function upd(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to save item");
      setForm({ code: "", name: "", unit: "", price: "" });
      await load();
      setMsg("Saved.");
    } catch (e2) {
      setMsg(e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <div className="container py-10">Please log in.</div>;
  if (!isAdmin) return <div className="container py-10">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Price List</h1>

      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 grid md:grid-cols-4 gap-4">
        <label className="block">
          <div className="text-sm text-gray-600">Code</div>
          <input value={form.code} onChange={(e)=>upd("code", e.target.value)} className="w-full" placeholder="e.g. TEST_TAG" />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm text-gray-600">Name</div>
          <input value={form.name} onChange={(e)=>upd("name", e.target.value)} className="w-full" placeholder="Anchor testing & tag (per well)" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Unit</div>
          <input value={form.unit} onChange={(e)=>upd("unit", e.target.value)} className="w-full" placeholder="each / hour / mile" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Price</div>
          <input value={form.price} onChange={(e)=>upd("price", e.target.value)} className="w-full" placeholder="e.g. 150.00" />
        </label>
        <div className="md:col-span-4 flex gap-3">
          <button disabled={saving} className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white">
            {saving ? "Saving…" : "Add/Update Item"}
          </button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      </form>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Unit</th>
              <th className="text-left p-3">Price</th>
            </tr>
          </thead>
        <tbody>
          {loading ? (
            <tr><td className="p-4" colSpan={4}>Loading…</td></tr>
          ) : items.length === 0 ? (
            <tr><td className="p-4" colSpan={4}>No items.</td></tr>
          ) : (
            items.map((it) => (
              <tr key={it.code} className="border-t">
                <td className="p-3 font-mono">{it.code}</td>
                <td className="p-3">{it.name}</td>
                <td className="p-3">{it.unit || "—"}</td>
                <td className="p-3">${Number(it.price).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
