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

export default function WellLocationMap({ coords, title = "Well Location" }) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const latlng = useMemo(() => parseLatLng(coords), [coords]);

  useEffect(() => {
    if (!ready) return;
    if (!mapRef.current) return;
    if (!window.google?.maps) return;
    if (!latlng) return;

    if (!mapObjRef.current) {
      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center: latlng,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,

        zoomControl: true,
        scrollwheel: true,
        gestureHandling: "greedy",
      });
    } else {
      mapObjRef.current.setCenter(latlng);
    }

    if (markerRef.current) markerRef.current.setMap(null);

    markerRef.current = new window.google.maps.Marker({
      position: latlng,
      map: mapObjRef.current,
      title: title,
    });
  }, [ready, latlng, title]);

  if (!key) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-red-600">
        Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Add it in Vercel env vars.
      </div>
    );
  }

  if (!coords || !latlng) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-gray-600">
        No valid coordinates saved for this well.
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
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-gray-500">{coords}</div>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: 360 }} />
    </div>
  );
}
