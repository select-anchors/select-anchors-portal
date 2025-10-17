"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWellPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const f = new FormData(e.currentTarget);

    const payload = {
      // company & company man
      company: f.get("company")?.trim() || "",
      company_email: f.get("company_email")?.trim() || "",
      company_phone: f.get("company_phone")?.trim() || "",
      company_address: f.get("company_address")?.trim() || "",
      company_man_name: f.get("company_man_name")?.trim() || "",
      company_man_email: f.get("company_man_email")?.trim() || "",
      company_man_phone: f.get("company_man_phone")?.trim() || "",

      // new / reordered fields
      lease_well_name: f.get("lease_well_name")?.trim() || "",  // NEW
      api: f.get("api")?.trim() || "",

      // text areas / dates
      previous_anchor_work: f.get("previous_anchor_work")?.trim() || "", // NEW (textarea)
      directions_notes: f.get("directions_notes")?.trim() || "",        // RENAMED (textarea)
      last_test_date: f.get("last_test_date") || null,

      // anchors + expirations
      anchor1_lat: f.get("anchor1_lat") || null,
      anchor1_lng: f.get("anchor1_lng") || null,
      anchor1_expiration: f.get("anchor1_expiration") || null,
      anchor2_lat: f.get("anchor2_lat") || null,
      anchor2_lng: f.get("anchor2_lng") || null,
      anchor2_expiration: f.get("anchor2_expiration") || null,
      anchor3_lat: f.get("anchor3_lat") || null,
      anchor3_lng: f.get("anchor3_lng") || null,
      anchor3_expiration: f.get("anchor3_expiration") || null,
      anchor4_lat: f.get("anchor4_lat") || null,
      anchor4_lng: f.get("anchor4_lng") || null,
      anchor4_expiration: f.get("anchor4_expiration") || null,
    };

    try {
      const res = await fetch("/api/wells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed (${res.status})`);
      }

      router.push("/dashboard");
    } catch (err) {
      setMsg(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-xl font-bold mb-1">New Well</h1>
      <p className="text-sm text-gray-600 mb-6">
        Fill in details. Submission will appear in “Pending Approval”.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {/* Company row */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input name="company" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Email</label>
            <input name="company_email" type="email" className="w-full rounded-xl border p-2" />
          </div>
        </div>

        {/* Company phone/address */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Phone</label>
            <input name="company_phone" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Address</label>
            <input name="company_address" className="w-full rounded-xl border p-2" />
          </div>
        </div>

        {/* Company man rows */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Man (Name)</label>
            <input name="company_man_name" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Man Email</label>
            <input name="company_man_email" type="email" className="w-full rounded-xl border p-2" />
          </div>
        </div>

        {/* line break, then phone; then Lease/Well Name; then API */}
        <div>
          <label className="block text-sm font-medium mb-1">Company Man Phone</label>
          <input name="company_man_phone" className="w-full rounded-xl border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Lease/Well Name</label>
          <input name="lease_well_name" className="w-full rounded-xl border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Well API</label>
          <input name="api" className="w-full rounded-xl border p-2" />
        </div>

        {/* Textareas / date */}
        <div>
          <label className="block text-sm font-medium mb-1">Previous Anchor Work</label>
          <textarea name="previous_anchor_work" rows={3} className="w-full rounded-xl border p-2" placeholder="Work done before SA took over (tests, installs, issues, notes)" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Last Test Date</label>
            <input name="last_test_date" type="date" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Directions & Other Notes</label>
            <textarea name="directions_notes" rows={3} className="w-full rounded-xl border p-2" placeholder="Directions to location, gate codes, landmarks, etc." />
          </div>
        </div>

        {/* Anchors with expirations */}
        {[1,2,3,4].map((n) => (
          <div key={n} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{`Anchor #${n} Lat`}</label>
              <input name={`anchor${n}_lat`} className="w-full rounded-xl border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{`Anchor #${n} Lng`}</label>
              <input name={`anchor${n}_lng`} className="w-full rounded-xl border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{`Anchor #${n} Expiration`}</label>
              <input name={`anchor${n}_expiration`} type="date" className="w-full rounded-xl border p-2" />
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-xl border border-gray-400 bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create (needs approval)"}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
