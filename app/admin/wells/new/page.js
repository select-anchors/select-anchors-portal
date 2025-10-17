"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWellPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",
    api: "",
    previous_anchor_company: "",
    last_test_date: "",
    anchor1_lat: "", anchor1_lng: "",
    anchor2_lat: "", anchor2_lng: "",
    anchor3_lat: "", anchor3_lng: "",
    anchor4_lat: "", anchor4_lng: "",
  });

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/wells", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({
          ...form,
          is_approved: false, // new entries require approval
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      // Go back to admin list
      router.push("/admin/wells");
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, name, type="text", placeholder="" }) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => update(name, e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-xl px-3 py-2"
        required={name === "company_name" || name === "api"}
      />
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-1">New Well</h1>
      <p className="text-sm text-gray-600 mb-6">
        Fill in details. Submission will appear in “Pending Approval”.
      </p>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
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

          <Field label="Anchor #1 Lat" name="anchor1_lat" />
          <Field label="Anchor #1 Lng" name="anchor1_lng" />
          <Field label="Anchor #2 Lat" name="anchor2_lat" />
          <Field label="Anchor #2 Lng" name="anchor2_lng" />
          <Field label="Anchor #3 Lat" name="anchor3_lat" />
          <Field label="Anchor #3 Lng" name="anchor3_lng" />
          <Field label="Anchor #4 Lat" name="anchor4_lat" />
          <Field label="Anchor #4 Lng" name="anchor4_lng" />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => history.back()}
            className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create (needs approval)"}
          </button>
        </div>
      </form>
    </div>
  );
}
