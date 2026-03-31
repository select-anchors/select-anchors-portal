// app/wells/[api]/services/new/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const POSITIONS = ["NW", "NE", "SE", "SW"];

export default function NewServicePage({ params }) {
  const router = useRouter();
  const api = decodeURIComponent(params.api);

  const [form, setForm] = useState({
    service_date: "",
    service_type: "test",
    tested_by_company: "",
    technician_name: "",
    recommended_action: "",
    invoice_number: "",
    notes: "",
    anchors: POSITIONS.map((p) => ({
      anchor_position: p,
      inches_out_of_ground: "",
      pull_result_lbs: "",
      pass_fail: "",
      deactivated: false,
      replacement_required: false,
      notes: ""
    }))
  });

  function updateAnchor(index, field, value) {
    const copy = [...form.anchors];
    copy[index][field] = value;
    setForm({ ...form, anchors: copy });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch(
      `/api/wells/${encodeURIComponent(api)}/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      }
    );

    if (!res.ok) {
      alert("Failed to save service");
      return;
    }

    router.push(`/wells/${api}`);
  }

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-2xl font-bold">New Service Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        <input
          type="date"
          required
          value={form.service_date}
          onChange={(e) =>
            setForm({ ...form, service_date: e.target.value })
          }
          className="border p-2 rounded"
        />

        <select
          value={form.service_type}
          onChange={(e) =>
            setForm({ ...form, service_type: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="test">Test</option>
          <option value="install">Install</option>
          <option value="test_install">Test + Install</option>
        </select>

        <input
          placeholder="Tested By Company"
          value={form.tested_by_company}
          onChange={(e) =>
            setForm({ ...form, tested_by_company: e.target.value })
          }
          className="border p-2 rounded w-full"
        />

        <input
          placeholder="Technician Name"
          value={form.technician_name}
          onChange={(e) =>
            setForm({ ...form, technician_name: e.target.value })
          }
          className="border p-2 rounded w-full"
        />

        <textarea
          placeholder="Recommended Action"
          value={form.recommended_action}
          onChange={(e) =>
            setForm({ ...form, recommended_action: e.target.value })
          }
          className="border p-2 rounded w-full"
        />

        <textarea
          placeholder="Service Notes"
          value={form.notes}
          onChange={(e) =>
            setForm({ ...form, notes: e.target.value })
          }
          className="border p-2 rounded w-full"
        />

        <h2 className="text-lg font-semibold">Anchor Measurements</h2>

        {form.anchors.map((anchor, i) => (
          <div key={anchor.anchor_position} className="border p-4 rounded space-y-2">

            <strong>{anchor.anchor_position}</strong>

            <input
              placeholder="Inches Out of Ground"
              value={anchor.inches_out_of_ground}
              onChange={(e) =>
                updateAnchor(i, "inches_out_of_ground", e.target.value)
              }
              className="border p-2 rounded w-full"
            />

            <input
              placeholder="Pull Result (lbs)"
              value={anchor.pull_result_lbs}
              onChange={(e) =>
                updateAnchor(i, "pull_result_lbs", e.target.value)
              }
              className="border p-2 rounded w-full"
            />

            <input
              placeholder="Pass / Fail"
              value={anchor.pass_fail}
              onChange={(e) =>
                updateAnchor(i, "pass_fail", e.target.value)
              }
              className="border p-2 rounded w-full"
            />

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={anchor.deactivated}
                onChange={(e) =>
                  updateAnchor(i, "deactivated", e.target.checked)
                }
              />
              Deactivated
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={anchor.replacement_required}
                onChange={(e) =>
                  updateAnchor(i, "replacement_required", e.target.checked)
                }
              />
              Replacement Required
            </label>

          </div>
        ))}

        <button className="bg-[#2f4f4f] text-white px-6 py-2 rounded">
          Save Service
        </button>

      </form>
    </div>
  );
}
