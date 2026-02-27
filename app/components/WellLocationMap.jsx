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
  const [scriptError, setScriptError] = useState("");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps) setReady(true);
  }, []);

  const latlng = useMemo(() => parseLatLng(coords), [coords]);

  useEffect(() => {
    if (!ready) return;
    if (!mapRef.current) return;
    if (!window.google?.maps) return;

    const fallback = { lat: 32.0, lng: -103.0 };
    const center = latlng || fallback;

    if (!mapObjRef.current) {
      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: latlng ? 14 : 6,

        // ✅ same default as dashboard map
        mapTypeId: "hybrid",

        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },

        streetViewControl: false,
        fullscreenControl: true,

        zoomControl: true,
        scrollwheel: true,
        gestureHandling: "greedy",
      });
    } else {
      mapObjRef.current.setCenter(center);
      mapObjRef.current.setZoom(latlng ? 14 : 6);
    }

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (latlng) {
      markerRef.current = new window.google.maps.Marker({
        position: latlng,
        map: mapObjRef.current,
        title,
      });
    }
  }, [ready, latlng, title]);

  if (!key) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-red-600">
        Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  if (scriptError) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-red-600">
        Google Maps failed to load: {scriptError}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setScriptError("Script load error (check API key / referrer restrictions).")}
      />
      <div className="p-4 border-b">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-gray-500">
          {latlng ? "Satellite (labels on) by default — switch to Map using the control." : "No GPS coordinates provided."}
        </div>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: 420 }} />
    </div>
  );
}
