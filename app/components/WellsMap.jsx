// app/components/WellsMap.jsx
"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

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

function statusFromExpiration(expirationDate, windowDays = 90) {
  if (!expirationDate) return "unknown";
  const d = new Date(expirationDate);
  if (Number.isNaN(d.getTime())) return "unknown";

  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return "expired";
  if (days <= windowDays) return "expiring";
  return "good";
}

function markerIcon(status) {
  const color =
    status === "expired"
      ? "#DC2626"
      : status === "expiring"
      ? "#D97706"
      : status === "good"
      ? "#16A34A"
      : "#6B7280";

  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C8.3 0 2 6.3 2 14c0 10.5 14 28 14 28s14-17.5 14-28C30 6.3 23.7 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="14" r="6" fill="white"/>
    </svg>
  `);

  return {
    url: `data:image/svg+xml,${svg}`,
    scaledSize: typeof window !== "undefined" && window.google
      ? new window.google.maps.Size(28, 36)
      : undefined,
    anchor: typeof window !== "undefined" && window.google
      ? new window.google.maps.Point(14, 36)
      : undefined,
  };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function WellsMap({
  wells = [],
  expiringWindowDays = 90,
  expiringOnly = false,
}) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapped = useMemo(() => {
    const items = (wells || [])
      .map((w) => {
        const ll = parseLatLng(w.wellhead_coords);
        if (!ll) return null;

        const exp =
          w.current_expires_at ??
          w.latest_expires_at ??
          w.expiration_date ??
          w.expiration ??
          null;

        const status = statusFromExpiration(exp, expiringWindowDays);

        return {
          ...w,
          latlng: ll,
          _status: status,
          _exp: exp,
        };
      })
      .filter(Boolean);

    return expiringOnly
      ? items.filter((x) => x._status === "expiring" || x._status === "expired")
      : items;
  }, [wells, expiringOnly, expiringWindowDays]);

  useEffect(() => {
    if (!ready) return;
    if (!mapRef.current) return;
    if (!window.google?.maps) return;

    // Initialize map once
    if (!mapObjRef.current) {
      const first = mapped[0]?.latlng || { lat: 32.0, lng: -103.0 };

      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center: first,
        zoom: mapped.length ? 7 : 6,

        // ✅ Default Satellite, but allow switching
        mapTypeId: "satellite",
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        },

        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        scrollwheel: true,
        gestureHandling: "greedy",
      });

      infoRef.current = new window.google.maps.InfoWindow();
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasAny = false;

    for (const w of mapped) {
      const pos = new window.google.maps.LatLng(w.latlng.lat, w.latlng.lng);
      bounds.extend(pos);
      hasAny = true;

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapObjRef.current,
        title: w.lease_well_name || w.api || "Well",
        icon: markerIcon(w._status),
      });

      marker.addListener("click", () => {
        const name = escapeHtml(w.lease_well_name || "—");
        const api = escapeHtml(w.api || "—");
        const company = escapeHtml(w.company_name || "—");
        const lastTest = escapeHtml(w.last_test_date || "—");
        const exp = escapeHtml(w._exp || w.expiration_date || "—");

        const detailsHref = `/wells/${encodeURIComponent(w.api || "")}`;
        const requestHref = `/jobs/new?api=${encodeURIComponent(w.api || "")}&lease_well_name=${encodeURIComponent(
          w.lease_well_name || ""
        )}&company_name=${encodeURIComponent(w.company_name || "")}`;

        const html = `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 260px;">
            <a href="${detailsHref}" style="display:block; font-weight:700; font-size:14px; margin-bottom:4px; text-decoration:underline; color:#111827;">
              ${name}
            </a>
            <div style="font-size: 12px; color: #374151; margin-bottom: 6px;">
              <div><span style="color:#6B7280;">API:</span> <span style="font-family: ui-monospace;">${api}</span></div>
              <div><span style="color:#6B7280;">Company:</span> ${company}</div>
              <div><span style="color:#6B7280;">Last test:</span> ${lastTest}</div>
              <div><span style="color:#6B7280;">Expires:</span> ${exp}</div>
            </div>
            <a href="${requestHref}" style="
              display:inline-block; padding:8px 10px; border-radius:12px;
              background:#2f4f4f; color:white; text-decoration:none; font-size:12px;
            ">Request Test</a>
          </div>
        `;

        infoRef.current.setContent(html);
        infoRef.current.open(mapObjRef.current, marker);
      });

      markersRef.current.push(marker);
    }

    if (hasAny) {
      mapObjRef.current.fitBounds(bounds, 40);
    }
  }, [ready, mapped, expiringWindowDays]);

  if (!key) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-red-600">
        Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Add it in your env vars to enable the map.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="p-4 border-b">
        <div className="font-semibold">Wells Map</div>
        <div className="text-xs text-gray-500">
          Showing {mapped.length} well{mapped.length === 1 ? "" : "s"}{" "}
          {expiringOnly ? "(expiring/expired only)" : ""}
          {" • "}
          Default: Satellite (switch in map controls)
        </div>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: 420 }} />
    </div>
  );
}
