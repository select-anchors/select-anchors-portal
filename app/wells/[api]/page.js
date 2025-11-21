"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

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

export default function WellDetailPage({ params }) {
  const { data: session, status } = useSession();
  const apiParam = decodeURIComponent(params.api);
  const [well, setWell] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/wells/${encodeURIComponent(apiParam)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Not found");
        const j = await res.json();
        if (mounted) setWell(j?.well || null);
      } catch {
        if (mounted) setWell(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [apiParam]);

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  if (loading) return <div className="container py-10">Loading well…</div>;
  if (!well)
    return (
      <div className="container py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-2">Well not found</h1>
          <p className="text-gray-600 mb-4">API: {apiParam}</p>
          <Link href="/admin/wells" className="underline text-[#2f4f4f]">
            ← Back to All Wells
          </Link>
        </div>
      </div>
    );

  const w = well;
  const isStaff =
    session?.user?.role === "admin" || session?.user?.role === "employee";

  return (
    <div className="container py-10 space-y-6">
      {/* Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {w.lease_well_name ?? "Untitled Well"}
          </h1>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="text-gray-600">API:</span>{" "}
              <span className="font-mono">{w.api}</span>
            </p>

            {w.wellhead_coords && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-600">Well Head GPS:</span>{" "}
                <a
                  className="text-blue-600 underline break-all"
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    w.wellhead_coords
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {w.wellhead_coords}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isStaff && (
            <Link
              href={`/admin/wells?api=${encodeURIComponent(
                w.api
              )}&edit=1`}
              className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100"
            >
              Edit
            </Link>
          )}
          <Link
            href={isStaff ? "/admin/wells" : "/wells"}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            All Wells
          </Link>
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
            <div className="font-medium">{w.company_email ?? "—"}</div>
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
            <div className="font-medium break-all">
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
              <div className="font-medium break-words">
                {w.anchor_ne ?? "—"}
              </div>
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_ne)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">NW Coords</div>
              <div className="font-medium break-words">
                {w.anchor_nw ?? "—"}
              </div>
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_nw)}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">SE Coords</div>
              <div className="font-medium break-words">
                {w.anchor_se ?? "—"}
              </div>
              <div className="text-xs text-gray-500">
                Expires: {fmtDate(w.expires_se)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">SW Coords</div>
              <div className="font-medium break-words">
                {w.anchor_sw ?? "—"}
              </div>
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
