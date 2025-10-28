// app/wells/[api]/page.js
import { q } from "@/lib/db";
import Link from "next/link";

function fmtDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function GpsLink({ coords }) {
  if (!coords) return <span className="font-medium">—</span>;
  const url = `https://maps.google.com/?q=${encodeURIComponent(coords)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-600 underline break-words"
    >
      {coords}
    </a>
  );
}

export default async function WellDetail({ params }) {
  const api = decodeURIComponent(params.api);

  // Use the view so we’re insulated from underlying column name changes
  const { rows } = await q(
    `SELECT *
       FROM wells_view
      WHERE api = $1
      LIMIT 1`,
    [api]
  );

  if (!rows?.length) {
    return (
      <div className="container py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-semibold">Well not found</h1>
          <p className="text-gray-600">
            API: <span className="font-mono">{api}</span>
          </p>
          <div className="flex gap-3">
            <Link href="/admin/wells" className="underline text-[#2f4f4f]">
              ← Back to All Wells
            </Link>
            <Link
              href="/admin/wells/new"
              className="underline text-blue-700"
            >
              + Create New Well
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const w = rows[0];

  return (
    <div className="container py-10 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {w.lease_well_name ?? "Untitled Well"}
            </h1>

            {/* API */}
            {w.api && (
              <p className="text-sm text-gray-700 mt-1">
                API: <span className="font-mono">{w.api}</span>
              </p>
            )}

            {/* Well Head GPS just under API */}
            {w.wellhead_coords && (
              <p className="text-sm text-gray-700 mt-1">
                Well Head GPS:{" "}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    w.wellhead_coords
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {w.wellhead_coords}
                </a>
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <Link
              href={`/admin/wells?api=${encodeURIComponent(w.api)}&edit=1`}
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Edit
            </Link>
            <Link
              href="/admin/wells"
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
            >
              All Wells
            </Link>
          </div>
        </div>
      </div>

      {/* Company Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Company</h2>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Company</div>
            <div className="font-medium">{w.company_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Phone</div>
            <div className="font-medium">{w.company_phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium break-words">
              {w.company_email ?? "—"}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm text-gray-600">Address</div>
            <div className="font-medium">{w.company_address ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Company Man Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Company Man</h2>
        </div>
        <div className="p-6 grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{w.company_man_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Phone</div>
            <div className="font-medium">{w.company_man_phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium break-words">
              {w.company_man_email ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Anchors & Expirations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Anchors & Expiration</h2>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">NE Coords</div>
              <GpsLink coords={w.anchor_ne} />
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_ne)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">NW Coords</div>
              <GpsLink coords={w.anchor_nw} />
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_nw)}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">SE Coords</div>
              <GpsLink coords={w.anchor_se} />
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_se)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">SW Coords</div>
              <GpsLink coords={w.anchor_sw} />
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_sw)}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Last Test Date</div>
              <div className="font-medium">{fmtDate(w.last_test_date)}</div>
            </div>
            {/* Placeholder cells if you later add more key dates */}
            <div />
            <div />
          </div>
        </div>
      </div>

      {/* Previous Work & Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">History & Notes</h2>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600">Previous Anchor Work</div>
            <div className="font-medium whitespace-pre-wrap">
              {w.prev_anchor_work ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Directions & Other Notes</div>
            <div className="font-medium whitespace-pre-wrap">
              {w.directions_notes ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
