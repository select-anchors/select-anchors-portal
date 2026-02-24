// app/admin/wells/[api]/edit/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function isValidLatLng(v) {
  if (!v) return true; // allow blank
  const s = String(v).trim();
  // "32.123,-103.456" (spaces allowed after comma)
  if (!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(s)) return false;

  const [latStr, lngStr] = s.split(",").map((x) => x.trim());
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function cleanDate(value) {
  // HTML date input gives "" when empty; DB wants null
  if (!value) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export default function EditWellPage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const apiParam = decodeURIComponent(params.api);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    lease_well_name: "",
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",
    previous_anchor_work: "",
    directions_other_notes: "",
    last_test_date: "",
    expiration_date: "",
    need_by: "",
    managed_by_company: "",
    status: "",
    wellhead_coords: "", // ✅ NEW
    county: "", // ✅ optional (your DB has county)
    customer: "", // ✅ DB requires customer NOT NULL in your screenshots
  });

  // Auth checks
  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }
  if (!session) {
    return <NotLoggedIn />;
  }
  const role = session?.user?.role;
  const canEdit = role === "admin" || role === "employee";
  if (!canEdit) {
    return <div className="container py-8">Not authorized.</div>;
  }

  // Load existing well
  useEffect(() => {
    let mounted = true;

    (async () => {
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
          company_name: w.company_name || "",
          company_email: w.company_email || "",
          company_phone: w.company_phone || "",
          company_address: w.company_address || "",
          company_man_name: w.company_man_name || "",
          company_man_email: w.company_man_email || "",
          company_man_phone: w.company_man_phone || "",
          previous_anchor_work: w.previous_anchor_work || "",
          directions_other_notes: w.directions_other_notes || "",
          last_test_date: w.last_test_date || "",
          expiration_date: w.expiration_date || "",
          need_by: w.need_by || "",
          managed_by_company: w.managed_by_company || "",
          status: w.status || "",
          wellhead_coords: w.wellhead_coords || "", // ✅ NEW
          county: w.county || "",
          customer: w.customer || "",
        });

        setError("");
      } catch (err) {
        console.error("Error loading well for edit:", err);
        if (mounted) setError("Could not load well details.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiParam]);

  function updateField(field) {
    return (e) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // ✅ validate coords
      if (!isValidLatLng(form.wellhead_coords)) {
        throw new Error(
          "Wellhead Coords must be in format: lat,lng (example: 32.345678,-103.456789)"
        );
      }

      // ✅ IMPORTANT: convert empty strings to null for DB
      const payload = {
        lease_well_name: cleanText(form.lease_well_name),
        company_name: cleanText(form.company_name),
        company_email: cleanText(form.company_email),
        company_phone: cleanText(form.company_phone),
        company_address: cleanText(form.company_address),
        company_man_name: cleanText(form.company_man_name),
        company_man_email: cleanText(form.company_man_email),
        company_man_phone: cleanText(form.company_man_phone),
        previous_anchor_work: cleanText(form.previous_anchor_work),
        directions_other_notes: cleanText(form.directions_other_notes),

        last_test_date: cleanDate(form.last_test_date),
        expiration_date: cleanDate(form.expiration_date),
        need_by: cleanDate(form.need_by),

        managed_by_company: cleanText(form.managed_by_company),
        status: cleanText(form.status),

        // ✅ NEW
        wellhead_coords: cleanText(form.wellhead_coords),

        // these exist in your DB column list; keep them editable so inserts/updates don't break
        county: cleanText(form.county),
        customer: cleanText(form.customer) || "Unknown", // DB appears to require NOT NULL
      };

      const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Failed to save changes.");
      }

      setSuccess("Well updated successfully.");
    } catch (err) {
      console.error("Error saving well:", err);
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="container py-8">Loading well…</div>;
  }

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

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-2xl shadow-sm p-6 space-y-6"
      >
        {/* Lease / Well Info */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Lease / Well Info</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Lease / Well Name
            </label>
            <input
              className="w-full"
              value={form.lease_well_name}
              onChange={updateField("lease_well_name")}
            />
          </div>

          {/* ✅ NEW: wellhead coords */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Wellhead Coords (lat,lng)
            </label>
            <input
              className="w-full font-mono"
              placeholder="32.345678,-103.456789"
              value={form.wellhead_coords}
              onChange={updateField("wellhead_coords")}
            />
            <div className="text-xs text-gray-500 mt-1">
              Optional. Format: <span className="font-mono">lat,lng</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">County</label>
              <input
                className="w-full"
                value={form.county}
                onChange={updateField("county")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Customer</label>
              <input
                className="w-full"
                placeholder="Required (use company/operator name)"
                value={form.customer}
                onChange={updateField("customer")}
              />
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Company</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Company Name
              </label>
              <input
                className="w-full"
                value={form.company_name}
                onChange={updateField("company_name")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Company Phone
              </label>
              <input
                className="w-full"
                value={form.company_phone}
                onChange={updateField("company_phone")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Company Email
              </label>
              <input
                className="w-full"
                value={form.company_email}
                onChange={updateField("company_email")}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">
                Company Address
              </label>
              <input
                className="w-full"
                value={form.company_address}
                onChange={updateField("company_address")}
              />
            </div>
          </div>
        </div>

        {/* Company Man */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Company Man</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                className="w-full"
                value={form.company_man_name}
                onChange={updateField("company_man_name")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                className="w-full"
                value={form.company_man_phone}
                onChange={updateField("company_man_phone")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                className="w-full"
                value={form.company_man_email}
                onChange={updateField("company_man_email")}
              />
            </div>
          </div>
        </div>

        {/* Dates & Status */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Dates & Status</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Last Test Date
              </label>
              <input
                type="date"
                className="w-full"
                value={form.last_test_date || ""}
                onChange={updateField("last_test_date")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                className="w-full"
                value={form.expiration_date || ""}
                onChange={updateField("expiration_date")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Need By</label>
              <input
                type="date"
                className="w-full"
                value={form.need_by || ""}
                onChange={updateField("need_by")}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Managed By Company
              </label>
              <input
                className="w-full"
                value={form.managed_by_company}
                onChange={updateField("managed_by_company")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <input
                className="w-full"
                placeholder="e.g. pending, active, expired"
                value={form.status}
                onChange={updateField("status")}
              />
            </div>
          </div>
        </div>

        {/* History & Notes */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">History & Notes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Previous Anchor Work
              </label>
              <textarea
                rows={4}
                className="w-full"
                value={form.previous_anchor_work}
                onChange={updateField("previous_anchor_work")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Directions & Other Notes
              </label>
              <textarea
                rows={4}
                className="w-full"
                value={form.directions_other_notes}
                onChange={updateField("directions_other_notes")}
              />
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
