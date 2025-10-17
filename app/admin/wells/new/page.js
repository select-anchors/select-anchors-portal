// app/admin/wells/new/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWellPage() {
  const r = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    // Force pending until an admin approves
    payload.status = "pending";

    const res = await fetch("/api/wells", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Failed to submit");
      return;
    }

    r.push("/admin/wells/pending");
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-2">New Well</h1>
      <p className="text-sm text-gray-600 mb-6">
        Fill in details. Submission will appear in <span className="font-medium">Pending Approval</span>.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company */}
        <input className="input" name="company" placeholder="Company" />
        <input className="input" name="company_email" placeholder="Company Email" />
        <input className="input" name="company_phone" placeholder="Company Phone" />
        <input className="input" name="company_address" placeholder="Company Address" />

        {/* Divider / line break after Company Man Phone */}
        <input className="input" name="company_man_name" placeholder="Company Man (Name)" />
        <input className="input" name="company_man_email" placeholder="Company Man Email" />
        <input className="input md:col-span-2" name="company_man_phone" placeholder="Company Man Phone" />

        {/* Lease / Well name then API */}
        <input className="input" name="lease_name" placeholder="Lease / Well Name" />
        <input className="input" name="api" placeholder="Well API" />

        {/* Dates */}
        <input className="input" name="last_test_date" type="date" placeholder="Last Test Date" />

        {/* Previous anchor work (larger) */}
        <textarea className="input md:col-span-2 h-24" name="previous_anchor_work" placeholder="Previous Anchor Work"></textarea>

        {/* Directions & Other Notes (larger) */}
        <textarea className="input md:col-span-2 h-24" name="notes_previous_manager" placeholder="Directions & Other Notes"></textarea>

        {/* GPS — 4 anchors */}
        <input className="input" name="anchor1_lat" placeholder="Anchor #1 Lat" />
        <input className="input" name="anchor1_lng" placeholder="Anchor #1 Lng" />
        <input className="input" name="anchor2_lat" placeholder="Anchor #2 Lat" />
        <input className="input" name="anchor2_lng" placeholder="Anchor #2 Lng" />
        <input className="input" name="anchor3_lat" placeholder="Anchor #3 Lat" />
        <input className="input" name="anchor3_lng" placeholder="Anchor #3 Lng" />
        <input className="input" name="anchor4_lat" placeholder="Anchor #4 Lat" />
        <input className="input" name="anchor4_lng" placeholder="Anchor #4 Lng" />

        {/* Actions */}
        <div className="md:col-span-2 flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => r.back()}
            className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create (needs approval)"}
          </button>
        </div>

        {/* simple input style */}
        <style jsx>{`
          .input {
            @apply w-full rounded-xl border border-gray-300 px-3 py-2 text-sm;
          }
        `}</style>
        {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}
      </form>
    </div>
  );
}
