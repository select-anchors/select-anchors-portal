// app/wells/[api]/page.js
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic"; // always fetch fresh data

function fmtDate(d) {
  if (!d) return "—";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d || "—";
  }
}

// Super simple admin check:
// - shows the Edit button only if a cookie named `sa_role=admin` is present
//   (swap this to your real auth later)
function isAdmin() {
  try {
    const c = cookies();
    return c.get("sa_role")?.value === "admin";
  } catch {
    // During static gen this can throw if no request context
    // We default to false
    return false;
  }
}

export default async function WellDetail({ params }) {
  const api = decodeURIComponent(params.api);

  // Pull well + (optional) company join. We coalesce so either source works.
  const { rows } = await q(
    `
    SELECT
      w.id,
      w.api,
      w.lease_name,
      w.company_id,
      -- Company info (prefer companies table; fall back to well fields if present)
      COALESCE(c.name, w.company_name)         AS company_name,
      COALESCE(c.email, w.company_email)       AS company_email,
      COALESCE(c.phone, w.company_phone)       AS company_phone,
      COALESCE(c.address, w.company_address)   AS company_address,

      -- Company man
      w.company_man_name,
      w.company_man_email,
      w.company_man_phone,

      -- Dates
      w.needed_by,
      w.expiration_date,
      w.last_test_date,

      -- Anchor coords (single text per corner)
      w.anchor_ne,
      w.anchor_nw,
      w.anchor_se,
      w.anchor_sw,

      -- Notes
      w.previous_anchor_work,
      w.directions_notes,

      -- Status-ish fields if you later add them
      w.status
    FROM wells w
    LEFT JOIN companies c ON c.id = w.company_id
    WHERE w.api = $1
    LIMIT 1
    `,
    [api]
  );

  if (!rows?.length) {
    return (
      <div className="container py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-2">Well not found</h1>
          <p className="text-gray-600 mb-6">
            We couldn’t find a well with API <span className="font-mono">{api}</span>.
          </p>
          <div className="flex gap-2">
            <Link
              href="/admin/wells"
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Back to All Wells
            </Link>
            <Link
              href="/admin/wells/new"
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
            >
              Create New Well
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const w = rows[0];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header / Breadcrumbs */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>{" "}
            /{" "}
            <Link href="/admin/wells" className="hover:underline">
              Wells
            </Link>{" "}
            / <span className="font-mono">{w.api}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            {w.lease_name || "Unnamed Lease"}{" "}
            <span className="text-gray-500 font-normal">({w.api})</span>
          </h1>
          <p className="text-sm text-gray-600">
            {w.company_name ? w.company_name : "No company set"}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/wells"
            className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
          >
            All Wells
          </Link>
          {isAdmin() && (
            <Link
              href={`/admin/wells/pending?edit=${encodeURIComponent(w.api)}`}
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
            >
              Edit Well
            </Link>
          )}
        </div>
      </div>

      {/* Dates / Status summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs uppercase tracking-wide text-gray-500">Needed By</div>
          <div className="text-lg font-semibold">{fmtDate(w.needed_by)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs uppercase tracking-wide text-gray-500">Expiration</div>
          <div className="text-lg font-semibold">{fmtDate(w.expiration_date)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs uppercase tracking-wide text-gray-500">Last Test Date</div>
          <div className="text-lg font-semibold">{fmtDate(w.last_test_date)}</div>
        </div>
      </div>

      {/* Company & Company Man */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Company Info</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-gray-500">Company</dt>
              <dd className="font-medium">{w.company_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Company Email</dt>
              <dd className="font-medium">{w.company_email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Company Phone</dt>
              <dd className="font-medium">{w.company_phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Company Address</dt>
              <dd className="font-medium">{w.company_address || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Company Man</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="font-medium">{w.company_man_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd className="font-medium">{w.company_man_phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="font-medium">{w.company_man_email || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Well Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Well Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
          <div>
            <dt className="text-xs text-gray-500">Lease / Well Name</dt>
            <dd className="font-medium">{w.lease_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">API</dt>
            <dd className="font-mono">{w.api}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="font-medium">{w.status || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Anchor Coordinates */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Anchor Coordinates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">NE</div>
            <div className="font-mono break-all">{w.anchor_ne || "—"}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">NW</div>
            <div className="font-mono break-all">{w.anchor_nw || "—"}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">SE</div>
            <div className="font-mono break-all">{w.anchor_se || "—"}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">SW</div>
            <div className="font-mono break-all">{w.anchor_sw || "—"}</div>
          </div>
        </div>
        {/* If you later want a "Open in Google Maps" button per coord, we can parse and link */}
      </div>

      {/* Previous Anchor Work */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Previous Anchor Work</h2>
        <p className="text-gray-800 whitespace-pre-wrap">
          {w.previous_anchor_work?.trim() || "—"}
        </p>
      </div>

      {/* Directions & Other Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Directions &amp; Other Notes</h2>
        <p className="text-gray-800 whitespace-pre-wrap">
          {w.directions_notes?.trim() || "—"}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/wells"
          className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
        >
          Back to All Wells
        </Link>
        <Link
          href="/admin/wells/new"
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          New Well
        </Link>
      </div>
    </div>
  );
}
