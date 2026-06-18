// app/admin/work-entry/page.js

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { hasPermission } from "../../../lib/permissions";

const POSITIONS = ["NW", "NE", "SE", "SW"];

function addYears(dateStr, years = 2) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function blankAnchor(position) {
  return {
    anchor_position: position,
    inches_out_of_ground: "",
    pull_result_lbs: "",
    pass_fail: "not_tested",
    red_bagged: false,
    needs_new_anchor: false,
    notes: "",
  };
}

function blankWell() {
  return {
    api: "",
    lease_well_name: "",
    county: "",
    state: "NM",
    latitude: "",
    longitude: "",
    previous_anchor_company: "",
    previous_anchor_work: "",
    directions_other_notes: "",
    anchors: POSITIONS.map(blankAnchor),
  };
}

export default function AdminWorkEntryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",

    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",

    service_type: "test",
    service_date: "",
    current_expires_at: "",
    tested_by_company: "Select Anchors",
    technician_name: "",
    notes: "",

    wells: [blankWell()],
  });

  const canUsePage =
    !!session &&
    (session.user?.role === "admin" ||
      hasPermission(session, "can_edit_wells") ||
      hasPermission(session, "can_view_all_wells"));

  const calculatedExpiration = useMemo(() => {
    return form.current_expires_at || addYears(form.service_date, 2);
  }, [form.service_date, form.current_expires_at]);

  function upd(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "service_date" && !prev.current_expires_at) {
        next.current_expires_at = addYears(value, 2);
      }

      return next;
    });
  }

  function updWell(index, key, value) {
    setForm((prev) => {
      const wells = [...prev.wells];
      wells[index] = { ...wells[index], [key]: value };
      return { ...prev, wells };
    });
  }

  function updAnchor(wellIndex, anchorIndex, key, value) {
    setForm((prev) => {
      const wells = [...prev.wells];
      const anchors = [...wells[wellIndex].anchors];

      anchors[anchorIndex] = {
        ...anchors[anchorIndex],
        [key]: value,
      };

      if (key === "red_bagged" && value === true) {
        anchors[anchorIndex].pass_fail = "fail";
        anchors[anchorIndex].needs_new_anchor = true;
      }

      wells[wellIndex] = { ...wells[wellIndex], anchors };
      return { ...prev, wells };
    });
  }

  function addWell() {
    setForm((prev) => ({
      ...prev,
      wells: [...prev.wells, blankWell()],
    }));
  }

  function removeWell(index) {
    setForm((prev) => {
      if (prev.wells.length === 1) return prev;
      return {
        ...prev,
        wells: prev.wells.filter((_, i) => i !== index),
      };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/work-entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          current_expires_at: calculatedExpiration,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save work entry.");
      }

      setMessage(
        `Saved. Created ${json.createdWells || 0}, updated ${
          json.updatedWells || 0
        }, added ${json.servicesCreated || 0} service record(s).`
      );

      setForm((prev) => ({
        ...prev,
        wells: [blankWell()],
      }));
    } catch (err) {
      setError(err?.message || "Failed to save work entry.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  if (!canUsePage) {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Master Work Entry</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add one or multiple wells, service dates, GPS coordinates, and anchor measurements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Company Info</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              required
              className="border rounded-xl px-3 py-2"
              placeholder="Company / Customer"
              value={form.company_name}
              onChange={(e) => upd("company_name", e.target.value)}
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company phone"
              value={form.company_phone}
              onChange={(e) => upd("company_phone", e.target.value)}
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company email"
              value={form.company_email}
              onChange={(e) => upd("company_email", e.target.value)}
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company address"
              value={form.company_address}
              onChange={(e) => upd("company_address", e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Company Man Info</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man name"
              value={form.company_man_name}
              onChange={(e) => upd("company_man_name", e.target.value)}
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man email"
              value={form.company_man_email}
              onChange={(e) => upd("company_man_email", e.target.value)}
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man phone"
              value={form.company_man_phone}
              onChange={(e) => upd("company_man_phone", e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Service Info</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Type</label>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={form.service_type}
                onChange={(e) => upd("service_type", e.target.value)}
              >
                <option value="test">Anchor Test</option>
                <option value="install_test">Install + Test</option>
                <option value="install">New Anchor Install</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Service Date</label>
              <input
                type="date"
                required
                className="w-full border rounded-xl px-3 py-2"
                value={form.service_date}
                onChange={(e) => upd("service_date", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                className="w-full border rounded-xl px-3 py-2"
                value={calculatedExpiration}
                onChange={(e) => upd("current_expires_at", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Defaults to service date + 2 years.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Technician</label>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.technician_name}
                onChange={(e) => upd("technician_name", e.target.value)}
              />
            </div>
          </div>

          <textarea
            className="w-full border rounded-xl px-3 py-2"
            rows={3}
            placeholder="Service notes"
            value={form.notes}
            onChange={(e) => upd("notes", e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {form.wells.map((well, wellIndex) => (
            <div key={wellIndex} className="bg-white border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Well #{wellIndex + 1}</h2>

                {form.wells.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeWell(wellIndex)}
                    className="px-3 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-sm"
                  >
                    Remove Well
                  </button>
                ) : null}
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <input
                  required
                  className="border rounded-xl px-3 py-2"
                  placeholder="API"
                  value={well.api}
                  onChange={(e) => updWell(wellIndex, "api", e.target.value)}
                />

                <input
                  required
                  className="border rounded-xl px-3 py-2"
                  placeholder="Lease / Well Name"
                  value={well.lease_well_name}
                  onChange={(e) =>
                    updWell(wellIndex, "lease_well_name", e.target.value)
                  }
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="County"
                  value={well.county}
                  onChange={(e) => updWell(wellIndex, "county", e.target.value)}
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="State"
                  value={well.state}
                  onChange={(e) => updWell(wellIndex, "state", e.target.value)}
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="Latitude"
                  value={well.latitude}
                  onChange={(e) => updWell(wellIndex, "latitude", e.target.value)}
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="Longitude"
                  value={well.longitude}
                  onChange={(e) => updWell(wellIndex, "longitude", e.target.value)}
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="Previous Anchor Company"
                  value={well.previous_anchor_company}
                  onChange={(e) =>
                    updWell(wellIndex, "previous_anchor_company", e.target.value)
                  }
                />

                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="Previous Anchor Work (Permian 2023-08)"
                  value={well.previous_anchor_work}
                  onChange={(e) =>
                    updWell(wellIndex, "previous_anchor_work", e.target.value)
                  }
                />
              </div>

              <textarea
                className="w-full border rounded-xl px-3 py-2"
                rows={2}
                placeholder="Directions / other notes"
                value={well.directions_other_notes}
                onChange={(e) =>
                  updWell(wellIndex, "directions_other_notes", e.target.value)
                }
              />

              <div className="rounded-2xl border bg-gray-50 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold">Anchor Measurements</h3>
                  <p className="text-sm text-gray-600">
                    Enter current measurements for each anchor head.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-600">
                      <tr>
                        <th className="text-left p-2">Position</th>
                        <th className="text-left p-2">Inches Out</th>
                        <th className="text-left p-2">Pull Result</th>
                        <th className="text-left p-2">Pass / Fail</th>
                        <th className="text-left p-2">Red Bagged</th>
                        <th className="text-left p-2">Needs New Anchor</th>
                        <th className="text-left p-2">Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {well.anchors.map((anchor, anchorIndex) => (
                        <tr key={anchor.anchor_position} className="border-t">
                          <td className="p-2 font-medium">{anchor.anchor_position}</td>

                          <td className="p-2">
                            <input
                              className="w-28 border rounded-lg px-2 py-1"
                              value={anchor.inches_out_of_ground}
                              onChange={(e) =>
                                updAnchor(
                                  wellIndex,
                                  anchorIndex,
                                  "inches_out_of_ground",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td className="p-2">
                            <input
                              className="w-28 border rounded-lg px-2 py-1"
                              value={anchor.pull_result_lbs}
                              onChange={(e) =>
                                updAnchor(
                                  wellIndex,
                                  anchorIndex,
                                  "pull_result_lbs",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td className="p-2">
                            <select
                              className="border rounded-lg px-2 py-1"
                              value={anchor.pass_fail}
                              onChange={(e) =>
                                updAnchor(
                                  wellIndex,
                                  anchorIndex,
                                  "pass_fail",
                                  e.target.value
                                )
                              }
                            >
                              <option value="not_tested">Not Tested</option>
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                            </select>
                          </td>

                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={!!anchor.red_bagged}
                              onChange={(e) =>
                                updAnchor(
                                  wellIndex,
                                  anchorIndex,
                                  "red_bagged",
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={!!anchor.needs_new_anchor}
                              onChange={(e) =>
                                updAnchor(
                                  wellIndex,
                                  anchorIndex,
                                  "needs_new_anchor",
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td className="p-2">
                            <input
                              className="w-48 border rounded-lg px-2 py-1"
                              value={anchor.notes}
                              onChange={(e) =>
                                updAnchor(wellIndex, anchorIndex, "notes", e.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addWell}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            + Add Another Well
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit Work Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
