"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function NewWellPage() {
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    lease_well_name: "",
    api: "",
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    company_man_name: "",
    company_man_phone: "",
    company_man_email: "",
    wellhead_coords: "",
    anchor_ne: "",
    anchor_nw: "",
    anchor_se: "",
    anchor_sw: "",
    prev_anchor_work: "",
    directions_notes: "",
    last_test_date: "",
    expires_ne: "",
    expires_nw: "",
    expires_se: "",
    expires_sw: "",
  });

  function upd(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/wells", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to save");
      setMsg("Submitted for approval.");
      setForm({
        lease_well_name: "",
        api: "",
        company_name: "",
        company_phone: "",
        company_email: "",
        company_address: "",
        company_man_name: "",
        company_man_phone: "",
        company_man_email: "",
        wellhead_coords: "",
        anchor_ne: "",
        anchor_nw: "",
        anchor_se: "",
        anchor_sw: "",
        prev_anchor_work: "",
        directions_notes: "",
        last_test_date: "",
        expires_ne: "",
        expires_nw: "",
        expires_se: "",
        expires_sw: "",
      });
    } catch (e2) {
      setMsg(e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session) return <div className="p-8">Please log in.</div>;
  const role = session?.user?.role;
  if (role !== "admin" && role !== "employee") return <div className="p-8">Not authorized.</div>;

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">New Well</h1>
      {msg && <div className="mb-4 text-sm">{msg}</div>}

      <form onSubmit={submit} className="space-y-8">
        {/* Company / Company Man */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Company</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Company</div>
              <input value={form.company_name} onChange={(e)=>upd("company_name", e.target.value)} className="w-full" />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Company Phone</div>
              <input value={form.company_phone} onChange={(e)=>upd("company_phone", e.target.value)} className="w-full" />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Company Email</div>
              <input value={form.company_email} onChange={(e)=>upd("company_email", e.target.value)} className="w-full" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-sm text-gray-600">Company Address</div>
              <input value={form.company_address} onChange={(e)=>upd("company_address", e.target.value)} className="w-full" />
            </label>
          </div>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Company Man</h2>
          </div>
          <div className="p-6 grid md:grid-cols-3 gap-4">
            <label className="block">
              <div className="text-sm text-gray-600">Name</div>
              <input value={form.company_man_name} onChange={(e)=>upd("company_man_name", e.target.value)} className="w-full" />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Phone</div>
              <input value={form.company_man_phone} onChange={(e)=>upd("company_man_phone", e.target.value)} className="w-full" />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Email</div>
              <input value={form.company_man_email} onChange={(e)=>upd("company_man_email", e.target.value)} className="w-full" />
            </label>
          </div>
        </div>

        {/* Well Header */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Well Header</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <div className="text-sm text-gray-600">Lease / Well Name</div>
              <input value={form.lease_well_name} onChange={(e)=>upd("lease_well_name", e.target.value)} className="w-full" />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">API</div>
              <input value={form.api} onChange={(e)=>upd("api", e.target.value)} className="w-full font-mono" />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Well Head GPS (paste from Maps)</div>
              <input value={form.wellhead_coords} onChange={(e)=>upd("wellhead_coords", e.target.value)} className="w-full" placeholder="32.12345, -103.12345" />
            </label>
          </div>
        </div>

        {/* Anchors & Expiration */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Anchors & Expiration</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {[
              ["anchor_ne", "NE Coords"],
              ["anchor_nw", "NW Coords"],
              ["anchor_se", "SE Coords"],
              ["anchor_sw", "SW Coords"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <div className="text-sm text-gray-600">{label}</div>
                <input value={form[key]} onChange={(e)=>upd(key, e.target.value)} className="w-full" placeholder="32.12345, -103.12345" />
              </label>
            ))}

            {[
              ["last_test_date", "Last Test Date"],
              ["expires_ne", "NE Expires"],
              ["expires_nw", "NW Expires"],
              ["expires_se", "SE Expires"],
              ["expires_sw", "SW Expires"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <div className="text-sm text-gray-600">{label}</div>
                <input type="date" value={form[key]} onChange={(e)=>upd(key, e.target.value)} className="w-full" />
              </label>
            ))}
          </div>
        </div>

        {/* History & Notes */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">History & Notes</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm text-gray-600">Previous Anchor Work</div>
              <textarea rows={6} value={form.prev_anchor_work} onChange={(e)=>upd("prev_anchor_work", e.target.value)} className="w-full" />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">Directions & Other Notes</div>
              <textarea rows={6} value={form.directions_notes} onChange={(e)=>upd("directions_notes", e.target.value)} className="w-full" />
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button disabled={saving} className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            {saving ? "Saving…" : "Submit for Approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
