"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

const EMPTY_FORM = {
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

  // Anchor coordinate strings (we can evolve these to structured lat/lng later)
  anchor_ne: "",
  anchor_nw: "",
  anchor_se: "",
  anchor_sw: "",

  prev_anchor_work: "",
  directions_notes: "",

  last_test_date: "",
  current_expires_at: "",
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600">{label}</div>
      {children}
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </label>
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

  const [form, setForm] = useState(EMPTY_FORM);

  function upd(key) {
    return (e) => {
      const value = e?.target?.value ?? e;
      setForm((p) => ({ ...p, [key]: value }));
    };
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      // Trim a few string fields so you don’t get “spaces-only” values.
      const payload = {
        ...form,
        lease_well_name: form.lease_well_name.trim(),
        api: form.api.trim(),
        wellhead_coords: form.wellhead_coords.trim(),
        anchor_ne: form.anchor_ne.trim(),
        anchor_nw: form.anchor_nw.trim(),
        anchor_se: form.anchor_se.trim(),
        anchor_sw: form.anchor_sw.trim(),
      };

      const res = await fetch("/api/wells", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to save");

      setMsg("Submitted for approval.");
      setForm(EMPTY_FORM);
    } catch (err) {
      setMsg(err?.message || "Something went wrong");
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Well</h1>
        <p className="text-sm text-gray-600 mt-1">
          Add a well site record. Submitting sends it for approval.
        </p>
      </div>

      {msg && (
        <div className="mb-6 text-sm border rounded-xl p-3 bg-gray-50">
          {msg}
        </div>
      )}

      <form onSubmit={submit} className="space-y-8">
        <Card title="Company">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Company">
              <input value={form.company_name} onChange={upd("company_name")} className="w-full" />
            </Field>

            <Field label="Company Phone">
              <input value={form.company_phone} onChange={upd("company_phone")} className="w-full" />
            </Field>

            <Field label="Company Email">
              <input value={form.company_email} onChange={upd("company_email")} className="w-full" />
            </Field>

            <div className="md:col-span-2">
              <Field label="Company Address">
                <input value={form.company_address} onChange={upd("company_address")} className="w-full" />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Company Man">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name">
              <input value={form.company_man_name} onChange={upd("company_man_name")} className="w-full" />
            </Field>

            <Field label="Phone">
              <input value={form.company_man_phone} onChange={upd("company_man_phone")} className="w-full" />
            </Field>

            <Field label="Email">
              <input value={form.company_man_email} onChange={upd("company_man_email")} className="w-full" />
            </Field>
          </div>
        </Card>

        <Card title="Well Header">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Lease / Well Name">
                <input value={form.lease_well_name} onChange={upd("lease_well_name")} className="w-full" />
              </Field>
            </div>

            <Field label="API">
              <input
                value={form.api}
                onChange={upd("api")}
                className="w-full font-mono"
                placeholder="e.g. 30-123-45678"
              />
            </Field>

            <Field
              label="Wellhead GPS (paste from Maps)"
              hint='Format: "32.12345, -103.12345"'
            >
              <input
                value={form.wellhead_coords}
                onChange={upd("wellhead_coords")}
                className="w-full"
                placeholder="32.12345, -103.12345"
              />
            </Field>
          </div>
        </Card>

        <Card title="Anchors">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["anchor_ne", "NE Anchor GPS"],
              ["anchor_nw", "NW Anchor GPS"],
              ["anchor_se", "SE Anchor GPS"],
              ["anchor_sw", "SW Anchor GPS"],
            ].map(([key, label]) => (
              <Field key={key} label={label} hint='Format: "32.12345, -103.12345"'>
                <input
                  value={form[key]}
                  onChange={upd(key)}
                  className="w-full"
                  placeholder="32.12345, -103.12345"
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Testing">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Last Test Date">
              <input type="date" value={form.last_test_date} onChange={upd("last_test_date")} className="w-full" />
            </Field>

            <Field label="Current Expiration Date">
              <input type="date" value={form.current_expires_at} onChange={upd("current_expires_at")} className="w-full" />
            </Field>
          </div>
        </Card>

        <Card title="History & Notes">
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Previous Anchor Work">
              <textarea
                rows={6}
                value={form.prev_anchor_work}
                onChange={upd("prev_anchor_work")}
                className="w-full"
              />
            </Field>

            <Field label="Directions & Other Notes">
              <textarea
                rows={6}
                value={form.directions_notes}
                onChange={upd("directions_notes")}
                className="w-full"
              />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit for Approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
