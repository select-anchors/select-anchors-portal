// app/wells/[api]/page.js
"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "@/app/components/NotLoggedIn";

function fmtDate(d) {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    const local = new Date(y, m - 1, day);
    return local.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function parseLatLng(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const nums = s.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;

  const a = Number(nums[0]);
  const b = Number(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  let lat = a;
  let lng = b;

  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    lat = b;
    lng = a;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function StatusBanner({ status, daysLeft, windowDays }) {
  const s = status || "unknown";
  const cls =
    s === "expired"
      ? "bg-red-50 text-red-800 border-red-200"
      : s === "expiring"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : s === "good"
          ? "bg-green-50 text-green-800 border-green-200"
          : "bg-gray-50 text-gray-700 border-gray-200";

  const title =
    s === "expired"
      ? "EXPIRED"
      : s === "expiring"
        ? "EXPIRING SOON"
        : s === "good"
          ? "GOOD"
          : "UNKNOWN";

  const detail =
    typeof daysLeft === "number"
      ? daysLeft < 0
        ? `${Math.abs(daysLeft)} day(s) past due`
        : s === "expiring"
          ? `${daysLeft} day(s) left (≤ ${windowDays} days)`
          : `${daysLeft} day(s) left`
      : "No expiration date set";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-extrabold tracking-wider">{title}</div>
        <div className="text-sm">{detail}</div>
      </div>
    </div>
  );
}

export default function WellDetailPage({ params }) {
  const { data: session, status } = useSession();
  const apiParam = decodeURIComponent(params.api);

  const [well, setWell] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map state
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markerRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const EXPIRING_WINDOW_DAYS = 90;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`/api/wells/${encodeURIComponent(apiParam)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Not found");
        const j = await res.json();
        if (!mounted) return;
        setWell(j ?? null);
      } catch (err) {
        console.error("Error loading well detail:", err);
        if (mounted) setWell(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiParam]);

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (loading) return <div className="container py-10">Loading well…</div>;

  if (!well) {
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
  }

  const w = well;
  const isStaff = session?.user?.role === "admin" || session?.user?.role === "employee";

  const lastTest = w.current_tested_at ?? w.last_test_date ?? null;
  const expires = w.current_expires_at ?? w.expiration_date ?? null;

  const daysLeft = useMemo(() => daysUntil(expires), [expires]);
  const statusKey = useMemo(
    () => statusFromExpiration(expires, EXPIRING_WINDOW_DAYS),
    [expires]
  );

  const latlng = useMemo(() => parseLatLng(w.wellhead_coords), [w.wellhead_coords]);

  // Init / update map
  useEffect(() => {
    if (!mapsReady) return;
    if (!window.google?.maps) return;
    if (!mapRef.current) return;
    if (!latlng) return;

    if (!mapObjRef.current) {
      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center: latlng,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "greedy",
        scrollwheel: true,
      });
    } else {
      mapObjRef.current.setCenter(latlng);
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: latlng,
        map: mapObjRef.current,
        title: w.lease_well_name || w.api || "Well",
      });
    } else {
      markerRef.current.setPosition(latlng);
    }
  }, [mapsReady, latlng, w.lease_well_name, w.api]);

  return (
    <div className="container py-10 space-y-6">
      {/* Title + Status */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{w.lease_well_name ?? "Untitled Well"}</h1>
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
                    href={`https://maps.google.com/?q=${encodeURIComponent(w.wellhead_coords)}`}
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
                href={`/admin/wells/${encodeURIComponent(w.api)}/edit`}
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

        <StatusBanner status={statusKey} daysLeft={daysLeft} windowDays={EXPIRING_WINDOW_DAYS} />
      </div>

      {/* Interactive map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Well Location</h2>
          <div className="text-xs text-gray-500">
            {latlng ? "Interactive map based on Well Head GPS." : "No valid GPS coordinates set for this well."}
          </div>
        </div>

        <div className="p-6">
          {!key ? (
            <div className="text-sm text-red-600">
              Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Add it in Vercel Env Vars to enable maps.
            </div>
          ) : !latlng ? (
            <div className="text-sm text-gray-600">
              Add coordinates like <span className="font-mono">32.12345, -103.12345</span> to show the map.
            </div>
          ) : (
            <>
              <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`}
                strategy="afterInteractive"
                onLoad={() => setMapsReady(true)}
              />
              <div ref={mapRef} style={{ width: "100%", height: 420 }} />
            </>
          )}
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
            <div className="font-medium break-all">{w.company_man_email ?? "—"}</div>
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
              <div className="text-sm text-gray-600">Last Test Date</div>
              <div className="font-medium">{fmtDate(lastTest)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Expiration Date</div>
              <div className="font-medium">{fmtDate(expires)}</div>
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
            <div className="font-medium whitespace-pre-wrap">{w.previous_anchor_work ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Directions & Other Notes</div>
            <div className="font-medium whitespace-pre-wrap">{w.directions_other_notes ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
