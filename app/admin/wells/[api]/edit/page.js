// app/admin/wells/[api]/edit/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotLoggedIn from "@/app/components/NotLoggedIn";

const US_STATES = [
  { code: "", name: "Select…" },
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export default function EditWellPage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const apiParam = decodeURIComponent(params.api);

  const role = session?.user?.role;
  const canEdit = role === "admin" || role === "employee";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    lease_well_name: "",
    wellhead_coords: "",
    county: "",
    state: "",

    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",

    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",

    previous_anchor_work: "",
    directions_other_notes: "",

    // editable test dates
    current_tested_at: "",
    current_expires_at: "",
  });

  // ✅ IMPORTANT: hooks must always run. So we declare this useEffect unconditionally.
  useEffect(() => {
    let mounted = true;

    async function load() {
      // Don’t fetch until session is resolved and user is allowed
      if (status !== "authenticated" || !canEdit) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Not found");
        const w = await res.json();

        if (!mounted) return;

        setForm({
          lease_well_name: w.lease_well_name || "",
          wellhead_coords: w.wellhead_coords || "",
          county: w.county || "",
          state: w.state || "",

          company_name: w.company_name || "",
          company_email: w.company_email || "",
          company_phone: w.company_phone || "",
          company_address: w.company_address || "",

          company_man_name: w.company_man_name || "",
          company_man_email: w.company_man_email || "",
          company_man_phone: w.company_man_phone || "",

          previous_anchor_work: w.previous_anchor_work || "",
          directions_other_notes: w.directions_other_notes || "",


          current_tested_at: w.current_tested_at || "",
          current_expires_at: w.current_expires_at || "",
        });

        setError("");
      } catch (e) {
        console.error("Error loading well for edit:", e);
        if (mounted) setError("Could not load well details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [apiParam, status, canEdit]);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const googleMapsHref = useMemo(() => {
    return form.wellhead_coords
      ? `https://maps.google.com/?q=${encodeURIComponent(form.wellhead_coords)}`
      : null;
  }, [form.wellhead_coords]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save changes.");
      }

      const updated = await res.json().catch(() => null);

      // Keep the form synced with DB (esp test dates)
      if (updated) {
        setForm((prev) => ({
          ...prev,
          current_tested_at: updated.current_tested_at ?? prev.current_tested_at,
          current_expires_at: updated.current_expires_at ?? prev.current_expires_at,
        }));
      }

      setSuccess("Well updated successfully.");
    } catch (e) {
      console.error("Error saving well:", e);
      setError(e.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Now it’s safe to do early returns (hooks already declared above)
  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!canEdit) return <div className="container py-8">Not authorized.</div>;
  if (loading) return <div className="container py-8">Loading well…</div>;

  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit Well</h1>
          <p className="text-sm text-gray-600">
            API: <span className="font-mono">{apiParam}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/wells/${encodeURIComponent(apiParam)}`}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            View Well
          </Link>
          <Link
            href="/admin/wells"
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm"
          >
            All Wells
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

      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow-sm p-6 space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Lease / Well Info</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Lease / Well Name</label>
            <input className="w-full" value={form.lease_well_name} onChange={updateField("lease_well_name")} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Wellhead Coords (lat,lng)</label>
            <input className="w-full" value={form.wellhead_coords} onChange={updateField("wellhead_coords")} />
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
              <span>Optional. Format: lat,lng</span>
              {googleMapsHref && (
                <a className="text-blue-600 underline" href={googleMapsHref} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">County</label>
              <input className="w-full" value={form.county} onChange={updateField("county")} />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">State</label>
              <select className="w-full" value={form.state} onChange={updateField("state")}>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code ? `${s.code} — ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Company</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Company Name</label>
              <input className="w-full" value={form.company_name} onChange={updateField("company_name")} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Company Phone</label>
              <input className="w-full" value={form.company_phone} onChange={updateField("company_phone")} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Company Email</label>
              <input className="w-full" value={form.company_email} onChange={updateField("company_email")} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Company Address</label>
              <input className="w-full" value={form.company_address} onChange={updateField("company_address")} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Company Man</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input className="w-full" value={form.company_man_name} onChange={updateField("company_man_name")} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input className="w-full" value={form.company_man_phone} onChange={updateField("company_man_phone")} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input className="w-full" value={form.company_man_email} onChange={updateField("company_man_email")} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Dates & Status</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Test Date (from tests)</label>
              <input
                type="date"
                className="w-full"
                value={form.current_tested_at || ""}
                onChange={updateField("current_tested_at")}
              />
              <div className="text-xs text-gray-500 mt-1">
                Editing this updates the latest entry in <code>well_tests</code>.
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Expiration Date (from tests)</label>
              <input
                type="date"
                className="w-full"
                value={form.current_expires_at || ""}
                onChange={updateField("current_expires_at")}
              />
              <div className="text-xs text-gray-500 mt-1">Leave blank for NULL.</div>
            </div>

            
          </div>

          
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">History & Notes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Previous Anchor Work</label>
              <textarea rows={4} className="w-full" value={form.previous_anchor_work} onChange={updateField("previous_anchor_work")} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Directions & Other Notes</label>
              <textarea rows={4} className="w-full" value={form.directions_other_notes} onChange={updateField("directions_other_notes")} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push("/admin/wells")}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
