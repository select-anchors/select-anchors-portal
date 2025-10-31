// app/admin/items/page.js
"use client";

import { useState, useEffect } from "react";

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  // Fetch items
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch("/api/admin/items");
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error("Failed to load items", err);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  // Handle edit form input
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(id) {
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const updated = await res.json();
      setItems((prev) =>
        prev.map((it) => (it.id === id ? updated : it))
      );
      setEditingId(null);
    } catch (err) {
      alert("Error saving item: " + err.message);
    }
  }

  async function toggleActive(id, isActive) {
    try {
      await fetch(`/api/admin/items/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, is_active: !isActive } : it
        )
      );
    } catch (err) {
      console.error("Failed to toggle item", err);
    }
  }

  if (loading)
    return (
      <div className="p-10 text-gray-600">
        Loading invoice items...
      </div>
    );

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Invoice Item Catalog</h1>
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
              <tr
                key={it.id}
                className="border-t hover:bg-gray-50 transition"
              >
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
                    `$${it.default_rate.toFixed(2)}`
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
