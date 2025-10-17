"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function AdminWellsPage() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvingId, setApprovingId] = useState(null);

  // Filters/Search
  const [q, setQ] = useState(""); // free text: company / api / company man
  const [status, setStatus] = useState("all"); // all | pending | approved

  // Edit modal state
  const [editing, setEditing] = useState(null); // the well being edited (object) or null
  const [savingEdit, setSavingEdit] = useState(false);

  // Load all wells (admin sees everything)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/wells", {
          headers: { "x-role": "admin" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load wells (${res.status})`);
        const data = await res.json();
        if (!cancel) setWells(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setError(String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return wells.filter(w => {
      const matchQ = !needle
        || (w.company_name || "").toLowerCase().includes(needle)
        || (w.api || "").toLowerCase().includes(needle)
        || (w.company_man_name || "").toLowerCase().includes(needle);
      const matchStatus =
        status === "all"
          ? true
          : status === "pending"
          ? !w.is_approved
          : !!w.is_approved;
      return matchQ && matchStatus;
    });
  }, [wells, q, status]);

  const pending = filtered.filter(w => !w.is_approved);
  const approved = filtered.filter(w => w.is_approved);

  async function approveWell(id) {
    try {
      setApprovingId(id);
      const res = await fetch("/api/wells", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-role": "admin",
        },
        body: JSON.stringify({ id, approve: true }),
      });
      if (!res.ok) throw new Error(`Approve failed (${res.status})`);
      const updated = await res.json();
      setWells(prev => prev.map(w => (w.id === id ? { ...w, ...updated } : w)));
    } catch (e) {
      alert(String(e));
    } finally {
      setApprovingId(null);
    }
  }

  function Row({ w }) {
    return (
      <tr className="border-b last:border-0">
        <td className="py-3 pl-5 pr-4 font-medium">
          {w.company_name || "—"}
          <div className="text-xs text-gray-500">
            {w.customer_id ? `Customer ID: ${w.customer_id}` : ""}
          </div>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap">{w.api || "—"}</td>
        <td className="py-3 pr-4">{w.company_phone || "—"}</td>
        <td className="py-3 pr-4">{w.company_man_name || "—"}</td>
        <td className="py-3 pr-4 whitespace-nowrap">
          {w.last_test_date ? new Date(w.last_test_date).toLocaleDateString() : "—"}
        </td>
        <td className="py-3 pr-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {w.api ? (
              <Link
                href={`/wells/${encodeURIComponent(w.api)}`}
                className="px-3 py-1.5 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
              >
                View
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-400">
                No API
              </span>
            )}

            <button
              onClick={() => setEditing(w)}
              className="px-3 py-1.5 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Edit
            </button>

            {!w.is_approved ? (
              <button
                onClick={() => approveWell(w.id)}
                disabled={approvingId === w.id}
                className="px-3 py-1.5 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
                title="Approve this well"
              >
                {approvingId === w.id ? "Approving..." : "Approve"}
              </button>
            ) : (
              <span className="inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500 text-white">
                Approved
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function downloadCSV(rows) {
    const headers = [
      "company_name","company_email","company_phone","company_address",
      "company_man_name","company_man_email","company_man_phone",
      "api",
      "anchor1_lat","anchor1_lng",
      "anchor2_lat","anchor2_lng",
      "anchor3_lat","anchor3_lng",
      "anchor4_lat","anchor4_lng",
      "previous_anchor_company",
      "last_test_date",
      "is_approved"
    ];
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replaceAll('"','""')}"`;
      }
      return s;
    };
    const lines = [
      headers.join(","),
      ...rows.map(r => headers.map(h => escape(r[h])).join(","))
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0,19).replaceAll(":","-");
    a.download = `wells-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Top bar */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin · Wells</h1>
          <p className="text-sm text-gray-600">
            Approve new wells, search/filter, edit entries, and export CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(filtered)}
            className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            title="Export currently visible rows"
          >
            Export CSV
          </button>
          <Link
            href="/admin/wells/new"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            New Well
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, API, or company man…"
          className="w-full md:w-2/3 border border-gray-300 rounded-xl px-3 py-2"
        />
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Pending */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 pt-4 pb-2 border-b">
          <h2 className="font-semibold">Pending Approval ({pending.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No pending wells.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-3 pl-5 pr-4">Company</th>
                <th className="py-3 pr-4">API</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Company Man</th>
                <th className="py-3 pr-4">Last Test</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>{pending.map(w => <Row key={w.id} w={w} />)}</tbody>
          </table>
        )}
      </section>

      {/* Approved */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="px-5 pt-4 pb-2 border-b">
          <h2 className="font-semibold">Approved Wells ({approved.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : approved.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No approved wells yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="border-b">
                <th className="py-3 pl-5 pr-4">Company</th>
                <th className="py-3 pr-4">API</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Company Man</th>
                <th className="py-3 pr-4">Last Test</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>{approved.map(w => <Row key={w.id} w={w} />)}</tbody>
          </table>
        )}
      </section>

      {/* EDIT MODAL */}
      {editing && (
        <EditModal
          well={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            // When edited, set is_approved=false (server should do this too).
            setWells(prev => prev.map(w => (w.id === updated.id ? { ...w, ...updated } : w)));
            setEditing(null);
          }}
          saving={savingEdit}
          setSaving={setSavingEdit}
        />
      )}
    </div>
  );
}

/** Edit modal component */
function EditModal({ well, onClose, onSaved, saving, setSaving }) {
  const [form, setForm] = useState(() => ({
    id: well.id,
    company_name: well.company_name || "",
    company_email: well.company_email || "",
    company_phone: well.company_phone || "",
    company_address: well.company_address || "",
    company_man_name: well.company_man_name || "",
    company_man_email: well.company_man_email || "",
    company_man_phone: well.company_man_phone || "",
    api: well.api || "",
    anchor1_lat: well.anchor1_lat || "",
    anchor1_lng: well.anchor1_lng || "",
    anchor2_lat: well.anchor2_lat || "",
    anchor2_lng: well.anchor2_lng || "",
    anchor3_lat: well.anchor3_lat || "",
    anchor3_lng: well.anchor3_lng || "",
    anchor4_lat: well.anchor4_lat || "",
    anchor4_lng: well.anchor4_lng || "",
    previous_anchor_company: well.previous_anchor_company || "",
    last_test_date: well.last_test_date ? new Date(well.last_test_date).toISOString().slice(0,10) : "",
  }));

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    try {
      setSaving(true);
      const res = await fetch("/api/wells", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ ...form, approve: false }), // edits should require re-approval
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const updated = await res.json();
      onSaved(updated);
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Well</h3>
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white">
            Close
          </button>
        </div>

        <FormGrid form={form} update={update} />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save (re-approve required)"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reusable grid of fields for both edit & new */
function FormGrid({ form, update }) {
  const Field = ({ label, name, type="text", placeholder="" }) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => update(name, e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-xl px-3 py-2"
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Company" name="company_name" />
      <Field label="Company Email" name="company_email" type="email" />
      <Field label="Company Phone" name="company_phone" />
      <Field label="Company Address" name="company_address" />

      <Field label="Company Man (Name)" name="company_man_name" />
      <Field label="Company Man Email" name="company_man_email" type="email" />
      <Field label="Company Man Phone" name="company_man_phone" />

      <Field label="Well API" name="api" />
      <Field label="Previous Anchor Company" name="previous_anchor_company" />
      <Field label="Last Test Date" name="last_test_date" type="date" />

      {/* Anchor GPS */}
      <Field label="Anchor #1 Lat" name="anchor1_lat" />
      <Field label="Anchor #1 Lng" name="anchor1_lng" />
      <Field label="Anchor #2 Lat" name="anchor2_lat" />
      <Field label="Anchor #2 Lng" name="anchor2_lng" />
      <Field label="Anchor #3 Lat" name="anchor3_lat" />
      <Field label="Anchor #3 Lng" name="anchor3_lng" />
      <Field label="Anchor #4 Lat" name="anchor4_lat" />
      <Field label="Anchor #4 Lng" name="anchor4_lng" />
    </div>
  );
}
