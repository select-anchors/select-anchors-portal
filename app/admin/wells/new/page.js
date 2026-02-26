"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

const ANCHORS = [
  { id: "nw", label: "NW" },
  { id: "se", label: "SE" },
  { id: "sw", label: "SW" },
];

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

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

    // anchors (pivoted)
    anchor_nw: "",
    anchor_se: "",
    anchor_sw: "",

    // dates
    last_test_date: "",
    current_expires_at: "",
    expires_nw: "",
    expires_se: "",
    expires_sw: "",

    prev_anchor_work: "",
    directions_notes: "",
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

        anchor_nw: "",
        anchor_se: "",
        anchor_sw: "",

        last_test_date: "",
        current_expires_at: "",
        expires_nw: "",
        expires_se: "",
        expires_sw: "",

        prev_anchor_work: "",
        directions_notes: "",
      });
    } catch (e2) {
      setMsg(e2.message);
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
      <h1 className="text-2xl font-bold mb-4">New Well</h1>
      {msg && <div className="mb-4 text-sm">{msg}</div>}

      <form onSubmit={submit} className="space-y-8">
        {/* Company */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Company</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <Field label="Company">
              <input value={form.company_name} onChange={(e) => upd("company_name", e.target.value)} className="w-full" />
            </Field>

            <Field label="Company Phone">
              <input value={form.company_phone} onChange={(e) => upd("company_phone", e.target.value)} className="w-full" />
            </Field>

            <Field label="Company Email">
              <input value={form.company_email} onChange={(e) => upd("company_email", e.target.value)} className="w-full" />
            </Field>

            <div className="md:col-span-2">
              <Field label="Company Address">
                <input value={form.company_address} onChange={(e) => upd("company_address", e.target.value)} className="w-full" />
              </Field>
            </div>
          </div>
        </div>

        {/* Company Man */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Company Man</h2>
          </div>
          <div className="p-6 grid md:grid-cols-3 gap-4">
            <Field label="Name">
              <input value={form.company_man_name} onChange={(e) => upd("company_man_name", e.target.value)} className="w-full" />
            </Field>

            <Field label="Phone">
              <input value={form.company_man_phone} onChange={(e) => upd("company_man_phone", e.target.value)} className="w-full" />
            </Field>

            <Field label="Email">
              <input value={form.company_man_email} onChange={(e) => upd("company_man_email", e.target.value)} className="w-full" />
            </Field>
          </div>
        </div>

        {/* Well Header */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Well Header</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Lease / Well Name">
                <input value={form.lease_well_name} onChange={(e) => upd("lease_well_name", e.target.value)} className="w-full" />
              </Field>
            </div>

            <Field label="API">
              <input value={form.api} onChange={(e) => upd("api", e.target.value)} className="w-full font-mono" />
            </Field>

            <Field label="Well Head GPS (paste from Maps)">
              <input
                value={form.wellhead_coords}
                onChange={(e) => upd("wellhead_coords", e.target.value)}
                className="w-full"
                placeholder="32.12345, -103.12345"
              />
            </Field>
          </div>
        </div>

        {/* Anchors & Expiration */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Anchors</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter coords + expiration for each anchor you want tracked.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-12 text-xs text-gray-500 px-1">
              <div className="col-span-2">Anchor</div>
              <div className="col-span-6">Coords</div>
              <div className="col-span-4">Expires</div>
            </div>

            {ANCHORS.map((a) => (
              <div key={a.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2 font-semibold">{a.label}</div>

                <div className="col-span-6">
                  <input
                    value={form[`anchor_${a.id}`]}
                    onChange={(e) => upd(`anchor_${a.id}`, e.target.value)}
                    className="w-full"
                    placeholder="32.12345, -103.12345"
                  />
                </div>

                <div className="col-span-4">
                  <input
                    type="date"
                    value={form[`expires_${a.id}`]}
                    onChange={(e) => upd(`expires_${a.id}`, e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            ))}

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <Field label="Last Test Date">
                <input type="date" value={form.last_test_date} onChange={(e) => upd("last_test_date", e.target.value)} className="w-full" />
              </Field>

              <Field label="Well Expiration Date (overall)">
                <input
                  type="date"
                  value={form.current_expires_at}
                  onChange={(e) => upd("current_expires_at", e.target.value)}
                  className="w-full"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">History & Notes</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <Field label="Previous Anchor Work">
              <textarea rows={6} value={form.prev_anchor_work} onChange={(e) => upd("prev_anchor_work", e.target.value)} className="w-full" />
            </Field>

            <Field label="Directions & Other Notes">
              <textarea rows={6} value={form.directions_notes} onChange={(e) => upd("directions_notes", e.target.value)} className="w-full" />
            </Field>
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
