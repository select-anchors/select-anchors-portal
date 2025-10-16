"use client";
import { useState } from "react";

export default function NewWell() {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setOk(null);

    const fd = new FormData(e.currentTarget);

    const anchors = ["NE","NW","SE","SW"].map(q => ({
      quadrant: q,
      lat: parseFloat(fd.get(`${q}_lat`)),
      lng: parseFloat(fd.get(`${q}_lng`)),
    }));

    const body = {
      kind: "create_well",
      submittedBy: "employee@selectanchors.com", // TODO: replace with real user from auth later
      well: {
        api: fd.get("api"),
        company: {
          name: fd.get("company_name"),
          email: fd.get("company_email") || null,
          phone: fd.get("company_phone") || null,
          address: fd.get("company_address") || null,
        },
        companyMan: {
          name: fd.get("cm_name") || null,
          number: fd.get("cm_number") || null,
          email: fd.get("cm_email") || null,
          cell: fd.get("cm_cell") || null,
        },
        previousAnchorCompany: fd.get("prev_anchor_company") || null,
        lastTestDate: fd.get("last_test_date") || null,
        anchors,
      }
    };

    const res = await fetch("/api/wells", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });

    setSaving(false);
    setOk(res.ok);
    if (res.ok) e.currentTarget.reset();
  }

  const input = "border rounded-lg px-3 py-2 w-full";

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Add New Well</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Well API *</label>
            <input name="api" required className={input} />
          </div>
          <div>
            <label className="block text-sm mb-1">Last Test Date</label>
            <input type="date" name="last_test_date" className={input} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="font-semibold">Company</h2>
            <input placeholder="Name *" name="company_name" required className={input} />
            <input placeholder="Email" name="company_email" className={input} />
            <input placeholder="Phone" name="company_phone" className={input} />
            <input placeholder="Address" name="company_address" className={input} />
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">Company Man</h2>
            <input placeholder="Name" name="cm_name" className={input} />
            <input placeholder="Number" name="cm_number" className={input} />
            <input placeholder="Email" name="cm_email" className={input} />
            <input placeholder="Cell" name="cm_cell" className={input} />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Previous Anchor Company</label>
          <input name="prev_anchor_company" className={input} />
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {["NE","NW","SE","SW"].map(q => (
            <div key={q} className="space-y-2">
              <h3 className="font-semibold">{q} Anchor</h3>
              <input step="any" placeholder="Latitude"  name={`${q}_lat`} className={input} />
              <input step="any" placeholder="Longitude" name={`${q}_lng`} className={input} />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button disabled={saving} className="btn btn-primary">
            {saving ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>

        {ok === true  && <p className="text-green-700">Submitted! Waiting for admin approval.</p>}
        {ok === false && <p className="text-red-700">Something went wrong.</p>}
      </form>
    </div>
  );
}
