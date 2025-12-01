"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminNewJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    well_api: "",
    company_name: "",
    lease_well_name: "",
    state: "",
    county: "",

    job_type: "test_existing",
    priority: "normal",
    customer_deadline_date: "",

    requires_811: false,
    one_call_state: "",
    requires_white_flags: false,
    select_anchors_installs_flags: false,
    mileage_multiplier: 1.0,

    scheduled_date: "",
  });

  function upd(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (k === "select_anchors_installs_flags") {
      setForm((p) => ({
        ...p,
        mileage_multiplier: v ? 2.0 : 1.0,
      }));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create job");

      router.push("/admin/jobs");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;

  if (!session) return <NotLoggedIn />;

  if (session.user.role !== "admin")
    return <div className="p-8">Not authorized</div>;

  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">New Job</h1>

      {msg && <div className="text-red-600 text-sm">{msg}</div>}

      <form onSubmit={submit} className="space-y-6">
        {/* ────────────────────────────────
            WELL & CUSTOMER INFO
        ──────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Location / Customer</h2>

          <TextField
            label="Company Name"
            value={form.company_name}
            onChange={(v) => upd("company_name", v)}
          />

          <TextField
            label="Lease + Well Name"
            value={form.lease_well_name}
            onChange={(v) => upd("lease_well_name", v)}
          />

          <TextField
            label="API Number"
            value={form.well_api}
            onChange={(v) => upd("well_api", v)}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="State"
              value={form.state}
              onChange={(v) => upd("state", v)}
            />
            <TextField
              label="County"
              value={form.county}
              onChange={(v) => upd("county", v)}
            />
          </div>
        </div>

        {/* ────────────────────────────────
            JOB TYPE & PRIORITY
        ──────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Job Details</h2>

          <SelectField
            label="Job Type"
            value={form.job_type}
            onChange={(v) => upd("job_type", v)}
            options={[
              ["test_existing", "Test Existing Anchors"],
              ["install_new", "Install New Anchor"],
              ["both", "Test + Install"],
            ]}
          />

          <SelectField
            label="Priority"
            value={form.priority}
            onChange={(v) => upd("priority", v)}
            options={[
              ["normal", "Normal"],
              ["asap", "ASAP"],
              ["deadline", "Customer Deadline"],
            ]}
          />

          {form.priority === "deadline" && (
            <TextField
              label="Customer Deadline Date"
              type="date"
              value={form.customer_deadline_date}
              onChange={(v) => upd("customer_deadline_date", v)}
            />
          )}
        </div>

        {/* ────────────────────────────────
            811 / ONE CALL
        ──────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center">
            811 / One Call
          </h2>

          <Checkbox
            label="This job requires 811 / One Call"
            checked={form.requires_811}
            onChange={(v) => upd("requires_811", v)}
          />

          {form.requires_811 && (
            <>
              <SelectField
                label="One Call State"
                value={form.one_call_state}
                onChange={(v) => upd("one_call_state", v)}
                options={[
                  ["TX", "Texas (Texas811)"],
                  ["NM", "New Mexico (NM811)"],
                ]}
              />

              <Checkbox
                label="This location is within city limits (requires white flags)"
                checked={form.requires_white_flags}
                onChange={(v) => upd("requires_white_flags", v)}
              />

              <Checkbox
                label="Select Anchors will install white-flags (double mileage)"
                checked={form.select_anchors_installs_flags}
                onChange={(v) => upd("select_anchors_installs_flags", v)}
              />

              <TextField
                label="Mileage Multiplier"
                type="number"
                disabled
                value={form.mileage_multiplier}
              />
            </>
          )}
        </div>

        {/* ────────────────────────────────
            SCHEDULING
        ──────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Scheduling</h2>

          <TextField
            label="Scheduled Date"
            type="date"
            value={form.scheduled_date}
            onChange={(v) => upd("scheduled_date", v)}
          />
        </div>

        <button
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          {saving ? "Creating…" : "Create Job"}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REUSABLE COMPONENTS
────────────────────────────────────────────── */

function TextField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-3 py-2 rounded-md"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-3 py-2 rounded-md"
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center space-x-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
