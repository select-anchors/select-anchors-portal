// app/wells/[api]/services/new/page.js
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../components/NotLoggedIn";
import { hasPermission } from "../../../../lib/permissions";

const ANCHOR_POSITIONS = ["NW", "NE", "SE", "SW"];

function buildInitialAnchor(position) {
  return {
    anchor_position: position,
    inches_out_of_ground: "",
    pull_tested: false,
    pull_result_lbs: "",
    pass_fail: "",
    deactivated: false,
    replacement_required: false,
    notes: "",
    replacement_installed: false,
    replacement_lat: "",
    replacement_lng: "",
    replacement_notes: "",
  };
}

export default function NewWellServicePage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const api = decodeURIComponent(params.api);

  const canEditWells = !!session && hasPermission(session, "can_edit_wells");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    service_date: new Date().toISOString().slice(0, 10),
    service_type: "test",
    tested_by_company: "Select Anchors",
    technician_name: session?.user?.name || "",
    notes: "",
    recommended_action: "",
    invoice_number: "",
    chart_recorder_file_url: "",
    jsa_file_url: "",
    invoice_file_url: "",
    anchors: ANCHOR_POSITIONS.map(buildInitialAnchor),
  });

  const backHref = useMemo(() => `/wells/${encodeURIComponent(api)}`, [api]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateAnchor(index, field, value) {
    setForm((prev) => {
      const anchors = [...prev.anchors];
      const next = { ...anchors[index], [field]: value };

      if (field === "pull_tested" && value === false) {
        next.pull_result_lbs = "";
        next.pass_fail = "";
      }

      if (field === "pass_fail" && value === "fail") {
        next.deactivated = true;
        next.replacement_required = true;
      }

      if (field === "replacement_installed" && value === false) {
        next.replacement_lat = "";
        next.replacement_lng = "";
        next.replacement_notes = "";
      }

      anchors[index] = next;
      return { ...prev, anchors };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        anchors: form.anchors.map((a) => ({
          ...a,
          inches_out_of_ground:
            a.inches_out_of_ground === "" ? null : a.inches_out_of_ground,
          pull_result_lbs: a.pull_result_lbs === "" ? null : a.pull_result_lbs,
          replacement_lat: a.replacement_lat === "" ? null : a.replacement_lat,
          replacement_lng: a.replacement_lng === "" ? null : a.replacement_lng,
        })),
      };

      const res = await fetch(
        `/api/wells/${encodeURIComponent(api)}/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save service.");
      }

      setSuccess("Service saved successfully.");
      router.push(backHref);
    } catch (err) {
      console.error("Failed to save service:", err);
      setError(err.message || "Failed to save service.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <div className="container py-10">Loading…</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  if (!canEditWells) {
    return <div className="container py-10">Not authorized.</div>;
  }

  return (
    <div className="container py-10 max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Add Service</h1>
          <p className="text-sm text-gray-600">
            API: <span className="font-mono">{api}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={backHref}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Back to Well
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Service Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Service Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={form.service_date}
                onChange={(e) => updateField("service_date", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Service Type
              </label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={form.service_type}
                onChange={(e) => updateField("service_type", e.target.value)}
              >
                <option value="test">Test</option>
                <option value="install_test">Install & Test</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Tested By Company
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.tested_by_company}
                onChange={(e) =>
                  updateField("tested_by_company", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Technician Name
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.technician_name}
                onChange={(e) =>
                  updateField("technician_name", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Invoice Number
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.invoice_number}
                onChange={(e) => updateField("invoice_number", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Chart Recorder File URL
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.chart_recorder_file_url}
                onChange={(e) =>
                  updateField("chart_recorder_file_url", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                JSA File URL
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.jsa_file_url}
                onChange={(e) => updateField("jsa_file_url", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Invoice File URL
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.invoice_file_url}
                onChange={(e) =>
                  updateField("invoice_file_url", e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Recommended Action
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border px-3 py-2"
              value={form.recommended_action}
              onChange={(e) =>
                updateField("recommended_action", e.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Service Notes
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border px-3 py-2"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {form.anchors.map((anchor, index) => (
            <div
              key={anchor.anchor_position}
              className="bg-white border rounded-2xl shadow-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-semibold">
                  Anchor {anchor.anchor_position}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Inches Out of Ground
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border px-3 py-2"
                    value={anchor.inches_out_of_ground}
                    onChange={(e) =>
                      updateAnchor(index, "inches_out_of_ground", e.target.value)
                    }
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={anchor.pull_tested}
                      onChange={(e) =>
                        updateAnchor(index, "pull_tested", e.target.checked)
                      }
                    />
                    Pull Tested
                  </label>
                </div>

                {anchor.pull_tested && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Pull Result (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border px-3 py-2"
                        value={anchor.pull_result_lbs}
                        onChange={(e) =>
                          updateAnchor(index, "pull_result_lbs", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Pass / Fail
                      </label>
                      <select
                        className="w-full rounded-xl border px-3 py-2"
                        value={anchor.pass_fail}
                        onChange={(e) =>
                          updateAnchor(index, "pass_fail", e.target.value)
                        }
                      >
                        <option value="">Select…</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={anchor.deactivated}
                      onChange={(e) =>
                        updateAnchor(index, "deactivated", e.target.checked)
                      }
                    />
                    Deactivated
                  </label>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={anchor.replacement_required}
                      onChange={(e) =>
                        updateAnchor(
                          index,
                          "replacement_required",
                          e.target.checked
                        )
                      }
                    />
                    Replacement Required
                  </label>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={anchor.replacement_installed}
                      onChange={(e) =>
                        updateAnchor(
                          index,
                          "replacement_installed",
                          e.target.checked
                        )
                      }
                    />
                    Replacement Installed
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Anchor Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2"
                  value={anchor.notes}
                  onChange={(e) =>
                    updateAnchor(index, "notes", e.target.value)
                  }
                />
              </div>

              {anchor.replacement_installed && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Replacement Anchor Info</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Replacement Lat
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        className="w-full rounded-xl border px-3 py-2"
                        value={anchor.replacement_lat}
                        onChange={(e) =>
                          updateAnchor(index, "replacement_lat", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Replacement Lng
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        className="w-full rounded-xl border px-3 py-2"
                        value={anchor.replacement_lng}
                        onChange={(e) =>
                          updateAnchor(index, "replacement_lng", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Replacement Notes
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border px-3 py-2"
                      value={anchor.replacement_notes}
                      onChange={(e) =>
                        updateAnchor(
                          index,
                          "replacement_notes",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href={backHref}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Service"}
          </button>
        </div>
      </form>
    </div>
  );
}
