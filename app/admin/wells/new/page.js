// app/admin/wells/new/page.js
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import NotLoggedIn from "../../../components/NotLoggedIn";

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-3 py-2 ${props.className || ""}`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border px-3 py-2 ${props.className || ""}`}
    />
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function NewWellPage() {
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ These keys MATCH your POST /api/wells route
  const [form, setForm] = useState({
    lease_well_name: "",
    api: "",
    wellhead_coords: "",
    county: "",
    state: "",

    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",

    company_man_name: "",
    company_man_phone: "",
    company_man_email: "",

    previous_anchor_company: "",
    previous_anchor_work: "",
    directions_other_notes: "",

    need_by: "",
    status: "pending",

    // Optional: set customer_id if you want (admin assigns)
    customer_id: "",
    customer: "",
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

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to save");

      setMsg("Well created.");
      setForm((p) => ({
        ...p,
        lease_well_name: "",
        api: "",
        wellhead_coords: "",
        county: "",
        state: "",
        company_name: "",
        company_phone: "",
        company_email: "",
        company_address: "",
        company_man_name: "",
        company_man_phone: "",
        company_man_email: "",
        previous_anchor_company: "",
        previous_anchor_work: "",
        directions_other_notes: "",
        need_by: "",
        status: "pending",
        customer_id: "",
        customer: "",
      }));
    } catch (e2) {
      setMsg(e2?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  const role = session?.user?.role;
  if (role !== "admin" && role !== "employee") {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex items-end justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">New Well</h1>
        {msg && <div className="text-sm text-gray-700">{msg}</div>}
      </div>

      <form onSubmit={submit} className="space-y-8">
        <Card title="Company">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Company Name">
              <TextInput value={form.company_name} onChange={(e) => upd("company_name", e.target.value)} />
            </Field>
            <Field label="Company Phone">
              <TextInput value={form.company_phone} onChange={(e) => upd("company_phone", e.target.value)} />
            </Field>
            <Field label="Company Email">
              <TextInput value={form.company_email} onChange={(e) => upd("company_email", e.target.value)} />
            </Field>
            <Field label="Company Address">
              <TextInput value={form.company_address} onChange={(e) => upd("company_address", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Company Man">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name">
              <TextInput value={form.company_man_name} onChange={(e) => upd("company_man_name", e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.company_man_phone} onChange={(e) => upd("company_man_phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput value={form.company_man_email} onChange={(e) => upd("company_man_email", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Well Info">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Lease / Well Name">
              <TextInput value={form.lease_well_name} onChange={(e) => upd("lease_well_name", e.target.value)} />
            </Field>

            <Field label="API">
              <TextInput
                value={form.api}
                onChange={(e) => upd("api", e.target.value)}
                className="font-mono"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Wellhead Coords (lat,lng)">
                <TextInput
                  value={form.wellhead_coords}
                  onChange={(e) => upd("wellhead_coords", e.target.value)}
                  placeholder="32.12345, -103.12345"
                />
              </Field>
            </div>

            <Field label="County">
              <TextInput value={form.county} onChange={(e) => upd("county", e.target.value)} />
            </Field>

            <Field label="State (2-letter)">
              <TextInput value={form.state} onChange={(e) => upd("state", e.target.value.toUpperCase())} placeholder="NM" />
            </Field>
          </div>
        </Card>

        <Card title="History & Notes">
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Previous Anchor Company">
              <TextInput value={form.previous_anchor_company} onChange={(e) => upd("previous_anchor_company", e.target.value)} />
            </Field>

            <Field label="Need By (optional)">
              <TextInput type="date" value={form.need_by} onChange={(e) => upd("need_by", e.target.value)} />
            </Field>

            <Field label="Previous Anchor Work">
              <TextArea
                rows={6}
                value={form.previous_anchor_work}
                onChange={(e) => upd("previous_anchor_work", e.target.value)}
              />
            </Field>

            <Field label="Directions & Other Notes">
              <TextArea
                rows={6}
                value={form.directions_other_notes}
                onChange={(e) => upd("directions_other_notes", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Well"}
          </button>
        </div>
      </form>
    </div>
  );
}
