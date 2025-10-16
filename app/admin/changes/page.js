"use client";
import { useEffect, useState } from "react";

export default function AdminChanges() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch("/api/admin/changes");
    const data = await res.json();
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function act(id, action) {
    const url = `/api/admin/changes/${id}/${action}`;
    await fetch(url, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({}) });
    await load();
  }

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Changes</h1>
      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{it.kind}</div>
                <div className="text-sm text-gray-600">Submitted by {it.submitted_by || "unknown"} • {new Date(it.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(it.id, "approve")} className="btn btn-primary">Approve</button>
                <button onClick={() => act(it.id, "reject")} className="btn btn-secondary">Reject</button>
              </div>
            </div>

            <pre className="mt-3 text-xs bg-gray-50 border rounded p-3 overflow-auto">
{JSON.stringify(it.payload, null, 2)}
            </pre>
          </div>
        ))}

        {items.length === 0 && <p>No pending items.</p>}
      </div>
    </div>
  );
}
