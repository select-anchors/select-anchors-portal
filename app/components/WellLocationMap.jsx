"use client";

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

  // If first number isn't a lat but second is, swap.
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    lat = b;
    lng = a;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * ✅ Load Google Maps exactly once (shared across Dashboard + Well Detail maps)
 * - Fixes: map sometimes blank until refresh
 * - Prevents: duplicate script loads & unreliable onLoad behavior
 */
function loadGoogleMaps(key) {
  if (typeof window === "undefined") return Promise.resolve(false);

  if (window.google?.maps) return Promise.resolve(true);

  // Reuse a global promise so every component shares one loader.
  if (window.__googleMapsPromise) return window.__googleMapsPromise;

  window.__googleMapsPromise = new Promise((resolve, reject) => {
    try {
      const existing = document.querySelector('script[data-google-maps="true"]');
      if (existing) {
        // If script exists, wait a moment for google.maps to appear.
        const start = Date.now();
        const t = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(t);
            resolve(true);
          } else if (Date.now() - start > 15000) {
            clearInterval(t);
            reject(new Error("Google Maps script loaded but google.maps did not initialize."));
          }
        }, 50);
        return;
      }

      const script = document.createElement("script");
      script.dataset.googleMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        key
      )}&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve(true);
      script.onerror = () =>
        reject(new Error("Script load error (check API key / referrer restrictions)."));

      document.head.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });

  return window.__googleMapsPromise;
}

export default function WellLocationMap({ coords, title = "Well Location" }) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState("");

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const latlng = useMemo(() => parseLatLng(coords), [coords]);

  // ✅ Robust loader (works on first nav + subsequent nav)
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!key) return;

      try {
        await loadGoogleMaps(key);
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("Google Maps load failed:", err);
        if (!cancelled) setScriptError(err?.message || "Google Maps failed to load.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    if (!mapRef.current) return;
    if (!window.google?.maps) return;

    const fallback = { lat: 32.0, lng: -103.0 }; // Permian-ish
    const center = latlng || fallback;

    // ✅ Create map once
    if (!mapObjRef.current) {
      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: latlng ? 14 : 6,

        // ✅ Default to satellite WITH labels ON:
        // "hybrid" = satellite tiles + labels
        mapTypeId: "hybrid",

        // ✅ Let user switch between Map/Satellite/Hybrid
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },

        streetViewControl: false,
        fullscreenControl: true,

        // ✅ Match dashboard feel
        zoomControl: true,
        scrollwheel: true,
        gestureHandling: "greedy",
      });
    } else {
      // ✅ Update view if coords change
      mapObjRef.current.setCenter(center);
      mapObjRef.current.setZoom(latlng ? 14 : 6);

      // ✅ Keep default as hybrid unless user changed it manually
      // (We do NOT force-reset mapTypeId here so the user’s choice sticks.)
    }

    // Clear old marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // Add marker if coords exist
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
      <div className="p-4 border-b">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-gray-500">
          Satellite (labels on) by default — switch Map/Satellite using the control.
        </div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: 420 }} />
    </div>
  );
}
