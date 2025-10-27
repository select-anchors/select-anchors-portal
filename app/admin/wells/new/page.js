// app/admin/wells/new/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWellPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    company: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",
    lease_name: "",
    api: "",
    previous_anchor_work: "",
    directions_notes: "",
    anchor1_coords: "",
    anchor2_coords: "",
    anchor3_coords: "",
    anchor4_coords: "",
    last_test_date: "",
    expiration_date: "",
    status: "Pending",
  });

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/wells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "Failed to save.");
        setSaving(false);
        return;
      }

      setMsg("Well saved!");
      router.push(`/wells/${encodeURIComponent(data.api)}`);
    } catch (err) {
      console.error(err);
      setMsg("Server error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">New Well</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* Company */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Company</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company}
              onChange={(e)=>setField("company", e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Company Email</label>
            <input type="email" className="w-full border rounded-xl px-3 py-2" value={form.company_email}
              onChange={(e)=>setField("company_email", e.target.value)} placeholder="ops@company.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Company Phone</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company_phone}
              onChange={(e)=>setField("company_phone", e.target.value)} placeholder="575-555-0100" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Company Address</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company_address}
              onChange={(e)=>setField("company_address", e.target.value)} placeholder="Street, City, ST" />
          </div>
        </div>

        {/* Company Man */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Company Man Name</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company_man_name}
              onChange={(e)=>setField("company_man_name", e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Company Man Email</label>
            <input type="email" className="w-full border rounded-xl px-3 py-2" value={form.company_man_email}
              onChange={(e)=>setField("company_man_email", e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Company Man Phone</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company_man_phone}
              onChange={(e)=>setField("company_man_phone", e.target.value)} placeholder="575-555-0101" />
          </div>
        </div>

        {/* Break → Lease/Well Name + Well API */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Lease/Well Name</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.lease_name}
              onChange={(e)=>setField("lease_name", e.target.value)} placeholder="Palo Duro 12 #3" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Well API</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.api}
              onChange={(e)=>setField("api", e.target.value)} placeholder="30-025-123456" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* API field …already present… */}

  {/* Well Head GPS (single paste field) */}
  <div>
    <label className="block text-sm font-medium mb-1">Well Head GPS</label>
    <input
      name="wellhead_coords"
      type="text"
      placeholder="32.702981,-103.136790"
      className="w-full rounded-md border px-3 py-2"
    />
    <p className="text-xs text-gray-500 mt-1">Paste from Google Maps (lat,lng)</p>
  </div>
</div>        </div>

        {/* Coordinates (single fields) */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Anchor #1 Coordinates</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.anchor1_coords}
              onChange={(e)=>setField("anchor1_coords", e.target.value)}
              placeholder="32.987654, -103.456789" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Anchor #2 Coordinates</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.anchor2_coords}
              onChange={(e)=>setField("anchor2_coords", e.target.value)}
              placeholder="32.987654, -103.456789" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Anchor #3 Coordinates</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.anchor3_coords}
              onChange={(e)=>setField("anchor3_coords", e.target.value)}
              placeholder="32.987654, -103.456789" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Anchor #4 Coordinates</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.anchor4_coords}
              onChange={(e)=>setField("anchor4_coords", e.target.value)}
              placeholder="32.987654, -103.456789" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Last Test Date</label>
            <input type="date" className="w-full border rounded-xl px-3 py-2" value={form.last_test_date}
              onChange={(e)=>setField("last_test_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Expiration Date</label>
            <input type="date" className="w-full border rounded-xl px-3 py-2" value={form.expiration_date}
              onChange={(e)=>setField("expiration_date", e.target.value)} />
          </div>
        </div>

        {/* Textareas */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Previous Anchor Work</label>
            <textarea rows={4} className="w-full border rounded-xl px-3 py-2" value={form.previous_anchor_work}
              onChange={(e)=>setField("previous_anchor_work", e.target.value)}
              placeholder="Notes on prior installations, repairs, dates, vendors…" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Directions &amp; Other Notes</label>
            <textarea rows={4} className="w-full border rounded-xl px-3 py-2" value={form.directions_notes}
              onChange={(e)=>setField("directions_notes", e.target.value)}
              placeholder="Gate code, driving notes, hazards, yard return, etc." />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Well"}
          </button>
          {msg && <div className="self-center text-sm text-gray-700">{msg}</div>}
        </div>
      </form>
    </div>
  );
}
