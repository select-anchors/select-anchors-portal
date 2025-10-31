// app/admin/items/page.js
"use client";

import { useState, useEffect } from "react";

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newData, setNewData] = useState({
    code: "",
    name: "",
    unit: "each",
    default_rate: "",
    qb_item_name: "",
    notes: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  // Load all items
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/items");
        const data = await res.json();
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Edit helpers
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }
  async function handleSave(id) {
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setEditingId(null);
    } catch (err) {
      alert("Error saving item: " + err.message);
    }
  }
  async function toggleActive(id, isActive) {
    try {
      const res = await fetch(`/api/admin/items/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch (err) {
      alert("Error toggling: " + err.message);
    }
  }

  // New item helpers
  function handleNewChange(e) {
    const { name, value } = e.target;
    setNewData((p) => ({ ...p, [name]: value }));
  }
  async function createNew() {
    // minimal client-side checks
    if (!newData.code.trim() || !newData.name.trim()) {
      alert("Code and Name are required.");
      return;
    }
    setSavingNew(true);
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newData,
          default_rate:
            newData.default_rate === "" ? null : Number(newData.default_rate),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setItems((prev) => [created, ...prev]);
      setShowNew(false);
      setNewData({
        code: "",
        name: "",
        unit: "each",
        default_rate: "",
        qb_item_name: "",
        notes: "",
      });
    } catch (err) {
      alert("Error creating item: " + err.message);
    } finally {
      setSavingNew(false);
    }
  }

  if (loading) return <div className="p-10 text-gray-600">Loading…</div>;

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoice Item Catalog</h1>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New Item
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Rate ($)</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{it.code}</td>
                <td className="p-3">
                  {editingId === it.id ? (
                    <input
                      name="name"
                      value={formData.name ?? it.name}
                      onChange={handleChange}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    it.name
                  )}
                </td>
                <td className="p-3">
                  {editingId === it.id ? (
                    <input
                      name="unit"
                      value={formData.unit ?? it.unit}
                      onChange={handleChange}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    it.unit
                  )}
                </td>
                <td className="p-3">
                  {editingId === it.id ? (
                    <input
                      name="default_rate"
                      type="number"
                      step="0.01"
                      value={formData.default_rate ?? it.default_rate}
                      onChange={handleChange}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    (it.default_rate ?? 0).toFixed(2)
                  )}
                </td>
                <td className="p-3">
                  <button
                    className={`px-2 py-1 rounded ${
                      it.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                    onClick={() => toggleActive(it.id, it.is_active)}
                  >
                    {it.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  {editingId === it.id ? (
                    <button
                      onClick={() => handleSave(it.id)}
                      className="text-blue-600 font-semibold"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(it.id);
                        setFormData(it);
                      }}
                      className="text-gray-600"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Item Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Catalog Item</h2>
              <button
                onClick={() => setShowNew(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Code *</label>
                  <input
                    name="code"
                    value={newData.code}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="ONECALL, TEST_TAG, …"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Unit</label>
                  <input
                    name="unit"
                    value={newData.unit}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="each / hour / mile / well / part"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Name *</label>
                  <input
                    name="name"
                    value={newData.name}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Anchor Testing & Tag (per well)"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Default Rate ($)</label>
                  <input
                    name="default_rate"
                    type="number"
                    step="0.01"
                    value={newData.default_rate}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="e.g. 150.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">QuickBooks Item (optional)</label>
                  <input
                    name="qb_item_name"
                    value={newData.qb_item_name}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="QB product/service name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Notes (optional)</label>
                  <textarea
                    name="notes"
                    value={newData.notes}
                    onChange={handleNewChange}
                    className="border rounded px-2 py-1 w-full"
                    rows={3}
                    placeholder="Details shown to admin only"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl border bg-white"
              >
                Cancel
              </button>
              <button
                onClick={createNew}
                disabled={savingNew}
                className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
              >
                {savingNew ? "Saving…" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
