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

    const form = new FormData(e.currentTarget);

    const payload = {
      // company & company man
      company: form.get("company")?.trim() || "",
      company_email: form.get("company_email")?.trim() || "",
      company_phone: form.get("company_phone")?.trim() || "",
      company_address: form.get("company_address")?.trim() || "",
      company_man_name: form.get("company_man_name")?.trim() || "",
      company_man_email: form.get("company_man_email")?.trim() || "",
      company_man_phone: form.get("company_man_phone")?.trim() || "",

      // well
      api: form.get("api")?.trim() || "",
      previous_anchor_company: form.get("previous_anchor_company")?.trim() || "",
      previous_manager_notes: form.get("previous_manager_notes")?.trim() || "",
      last_test_date: form.get("last_test_date") || null,

      // anchors: lat/lng + NEW expiration dates
      anchor1_lat: form.get("anchor1_lat") || null,
      anchor1_lng: form.get("anchor1_lng") || null,
      anchor1_expiration: form.get("anchor1_expiration") || null,

      anchor2_lat: form.get("anchor2_lat") || null,
      anchor2_lng: form.get("anchor2_lng") || null,
      anchor2_expiration: form.get("anchor2_expiration") || null,

      anchor3_lat: form.get("anchor3_lat") || null,
      anchor3_lng: form.get("anchor3_lng") || null,
      anchor3_expiration: form.get("anchor3_expiration") || null,

      anchor4_lat: form.get("anchor4_lat") || null,
      anchor4_lng: form.get("anchor4_lng") || null,
      anchor4_expiration: form.get("anchor4_expiration") || null,
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

      setMsg("Saved. Awaiting admin approval.");
      // Send them back to dashboard or a success state
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
        {/* Row 1 */}
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

        {/* Row 2 */}
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

        {/* Row 3 */}
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

        {/* Row 4 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Man Phone</label>
            <input name="company_man_phone" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Well API</label>
            <input name="api" className="w-full rounded-xl border p-2" />
          </div>
        </div>

        {/* Row 5 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Previous Anchor Company</label>
            <input name="previous_anchor_company" className="w-full rounded-xl border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Test Date</label>
            <input name="last_test_date" type="date" className="w-full rounded-xl border p-2" />
          </div>
        </div>

        {/* NEW: Previous manager notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes about previous manager</label>
          <textarea name="previous_manager_notes" rows={3} className="w-full rounded-xl border p-2" placeholder="Who managed anchors before, any issues, context, etc." />
        </div>

        {/* Anchors rows with expiration dates */}
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
