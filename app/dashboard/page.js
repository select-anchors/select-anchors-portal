// app/dashboard/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../components/NotLoggedIn";
import WellsMap from "../components/WellsMap";

function daysUntil(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function StatusPill({ status }) {
  const s = status || "unknown";
  const cls =
    s === "expired"
      ? "bg-red-50 text-red-700 border-red-200"
      : s === "expiring"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : s === "good"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-600 border-gray-200";

  const label =
    s === "expired"
      ? "Expired"
      : s === "expiring"
      ? "Expiring Soon"
      : s === "good"
      ? "Good"
      : "Unknown";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function ExpirationPill({ expirationDate, windowDays = 90 }) {
  const d = daysUntil(expirationDate);

  if (d === null) {
    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-xs bg-gray-50 text-gray-600 border-gray-200">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        —
      </span>
    );
  }

  const isOverdue = d < 0;
  const isExpiringSoon = d <= windowDays;

  const dotClass = isOverdue ? "bg-red-600" : isExpiringSoon ? "bg-amber-500" : "bg-green-600";
  const wrapClass = isOverdue
    ? "bg-red-50 text-red-700 border-red-200"
    : isExpiringSoon
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-green-50 text-green-700 border-green-200";

  return (
    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-xs ${wrapClass}`}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {isOverdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
    </span>
  );
}

const CountBadge = ({ value, loading }) => (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 border">
    {loading ? "…" : value}
  </span>
);

function StatCard({ title, value, loading, href, disabled }) {
  const content = (
    <div
      className={[
        "p-5 bg-white border rounded-2xl shadow-sm transition",
        disabled ? "opacity-60 cursor-not-allowed" : href ? "hover:shadow-md cursor-pointer" : "",
      ].join(" ")}
    >
      <div className="text-xs uppercase text-gray-500 tracking-wider">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{loading ? "—" : value}</div>
    </div>
  );

  if (!href || disabled) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const EXPIRING_WINDOW_DAYS = 90;

  const [stats, setStats] = useState({
    wells: 0,
    users: 0,
    pendingChanges: 0,
    upcomingTests: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [wells, setWells] = useState([]);
  const [loadingWells, setLoadingWells] = useState(true);

  const [showExpiring, setShowExpiring] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  const [visibleApis, setVisibleApis] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const role = session?.user?.role || "customer";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  const isCustomer = role === "customer";

  const wellsPageHref = isAdmin || isEmployee ? "/admin/wells" : "/wells";
  const usersPageHref = "/admin/users";

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const json = await res.json();
        if (isMounted) setStats(json);
      } catch {
        // keep defaults
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }

    run();
    return () => {
      isMounted = false;
    };
  }, [status]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();
        if (mounted) {
          const data = Array.isArray(json) ? json : Array.isArray(json?.wells) ? json.wells : [];
          setWells(data);
        }
      } catch {
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoadingWells(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [status]);

  const wellsWithStatus = useMemo(() => {
    return (wells || []).map((w) => {
      const exp =
        w.current_expires_at ??
        w.latest_expires_at ??
        w.expiration_date ??
        w.expiration ??
        null;

      return {
        ...w,
        _status: statusFromExpiration(exp, EXPIRING_WINDOW_DAYS),
        _days_left: daysUntil(exp),
        _exp_for_display: exp,
      };
    });
  }, [wells, EXPIRING_WINDOW_DAYS]);

  const checkboxFilteredWells = useMemo(() => {
    if (!showExpiring && !showExpired) return wellsWithStatus;

    return wellsWithStatus.filter((w) => {
      if (showExpiring && w._status === "expiring") return true;
      if (showExpired && w._status === "expired") return true;
      return false;
    });
  }, [wellsWithStatus, showExpiring, showExpired]);

  const listWells = useMemo(() => {
    let list = checkboxFilteredWells;

    if (Array.isArray(visibleApis) && visibleApis.length > 0) {
      const visibleSet = new Set(visibleApis);
      list = list.filter((w) => visibleSet.has(w.api));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => {
        const lease = (w.lease_well_name || "").toLowerCase();
        const api = (w.api || "").toLowerCase();
        const company = (w.company_name || "").toLowerCase();
        const companyMan = (w.company_man_name || "").toLowerCase();

        return (
          lease.includes(q) ||
          api.includes(q) ||
          company.includes(q) ||
          companyMan.includes(q)
        );
      });
    }

    return list;
  }, [checkboxFilteredWells, visibleApis, searchQuery]);

  const emptyFilterLabel = useMemo(() => {
    if (!showExpiring && !showExpired) return "No wells found.";
    if (showExpiring && showExpired) {
      return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days (or already expired).`;
    }
    if (showExpiring) return `No wells expiring within ${EXPIRING_WINDOW_DAYS} days.`;
    return "No expired wells.";
  }, [showExpiring, showExpired, EXPIRING_WINDOW_DAYS]);

  const emptyListLabel = useMemo(() => {
    const hasViewport = Array.isArray(visibleApis) && visibleApis.length > 0;
    const q = searchQuery.trim();

    if (q && hasViewport) return "No wells match your search in the current map view.";
    if (q) return "No wells match your search.";
    if (hasViewport) return "No wells in the current map view.";
    return emptyFilterLabel;
  }, [visibleApis, searchQuery, emptyFilterLabel]);

  if (status === "loading") {
    return <div className="container py-10">Loading...</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Welcome, {session.user?.name || "User"}!</h1>

        <div className="flex gap-3 text-sm bg-white border rounded-2xl px-4 py-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showExpiring}
              onChange={(e) => setShowExpiring(e.target.checked)}
            />
            <span>Expiring Soon (≤{EXPIRING_WINDOW_DAYS}d)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            <span>Expired</span>
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Wells" value={stats.wells} loading={loadingStats} href={wellsPageHref} />

        <StatCard
          title="Users"
          value={stats.users}
          loading={loadingStats}
          href={isAdmin ? usersPageHref : undefined}
          disabled={!isAdmin}
        />

        <StatCard
          title={`Upcoming Tests (≤${EXPIRING_WINDOW_DAYS}d)`}
          value={stats.upcomingTests}
          loading={loadingStats}
        />

        <StatCard title="Pending Changes" value={stats.pendingChanges} loading={loadingStats} />
      </div>

      {(isCustomer || isAdmin || isEmployee) && (
        <div className="space-y-4">
          <WellsMap
            wells={checkboxFilteredWells}
            expiringWindowDays={EXPIRING_WINDOW_DAYS}
            expiringOnly={showExpiring || showExpired}
            onVisibleWellsChange={setVisibleApis}
          />

          <div className="grid md:grid-cols-3 gap-6">
            {(isAdmin || isEmployee) && (
              <Link
                href="/driver/my-day"
                className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
              >
                <h2 className="text-xl font-semibold mb-2">My Day</h2>
                <p className="text-sm text-gray-600">
                  View and update today’s job details, routes, and well site work.
                </p>
              </Link>
            )}

            <Link
              href={wellsPageHref}
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">
                All Wells
                <CountBadge value={stats.wells} loading={loadingStats} />
              </h2>
              <p className="text-sm text-gray-600">
                View well data, anchor test results, and expiration dates.
              </p>
            </Link>

            <Link
              href="/account"
              className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">Account</h2>
              <p className="text-sm text-gray-600">
                Manage your login info and notification preferences.
              </p>
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/admin/users"
                  className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
                >
                  <h2 className="text-xl font-semibold mb-2">
                    Manage Users
                    <CountBadge value={stats.users} loading={loadingStats} />
                  </h2>
                  <p className="text-sm text-gray-600">
                    Create, edit, and reset passwords for employees and clients.
                  </p>
                </Link>

                <Link
                  href="/admin/changes"
                  className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
                >
                  <h2 className="text-xl font-semibold mb-2">
                    Pending Changes
                    <CountBadge value={stats.pendingChanges} loading={loadingStats} />
                  </h2>
                  <p className="text-sm text-gray-600">
                    Review and approve edits before they go live.
                  </p>
                </Link>

                <Link
                  href="/admin/items"
                  className="block p-6 border rounded-2xl shadow-sm hover:shadow-md transition bg-white"
                >
                  <h2 className="text-xl font-semibold mb-2">Items & Pricing</h2>
                  <p className="text-sm text-gray-600">
                    Manage service types, charges, and billing rates.
                  </p>
                </Link>
              </>
            )}
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <div className="font-semibold">Search</div>
                <div className="text-xs text-gray-500">
                  Filters the wells currently visible on the map.
                </div>
              </div>

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by lease/well, API, company, company man…"
                className="w-full md:w-[420px] rounded-xl border px-3 py-2"
              />
            </div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Wells in View</div>
                <div className="text-xs text-gray-500">
                  Showing {listWells.length} well{listWells.length === 1 ? "" : "s"} from the current map view.
                </div>
              </div>

              <Link href={wellsPageHref} className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50">
                Open Wells Page →
              </Link>
            </div>

            <div className="p-4">
              {loadingWells ? (
                <div className="text-sm text-gray-600">Loading wells…</div>
              ) : listWells.length === 0 ? (
                <div className="text-sm text-gray-600">{emptyListLabel}</div>
              ) : (
                <div className="space-y-3">
                  {listWells.map((w) => (
                    <div
                      key={w.api || `${w.lease_well_name}-x`}
                      className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <Link href={`/wells/${encodeURIComponent(w.api || "")}`} className="font-semibold underline">
                          {w.lease_well_name || "—"}
                        </Link>

                        <div className="text-xs text-gray-600">
                          API: <span className="font-mono">{w.api || "—"}</span>
                        </div>

                        <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2">
                          <span>
                            Last test: {w.last_test_date || "—"} • Expires: {w._exp_for_display || "—"}
                          </span>
                          <ExpirationPill
                            expirationDate={w._exp_for_display}
                            windowDays={EXPIRING_WINDOW_DAYS}
                          />
                        </div>

                        <div className="mt-1">
                          <StatusPill status={w._status} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/wells/${encodeURIComponent(w.api || "")}`}
                          className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                        >
                          View
                        </Link>

                        <Link
                          href={`/jobs/new?api=${encodeURIComponent(w.api || "")}&lease_well_name=${encodeURIComponent(
                            w.lease_well_name || ""
                          )}&company_name=${encodeURIComponent(w.company_name || "")}`}
                          className="px-3 py-2 rounded-xl bg-[#2f4f4f] text-white text-sm hover:opacity-90"
                        >
                          Request Test
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



And here is the current app/components/WellsMap.jsx:
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

  // If first number can't be lat but second can, swap.
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    lat = b;
    lng = a;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function daysUntil(dateStr) {
  if (!dateStr) return null;

  // Handle "YYYY-MM-DD" as local date to avoid timezone shifts
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

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

/**
 * ✅ Shared Google Maps loader (fixes: blank map until refresh)
 * Load the script ONCE for the whole app.
 */
function loadGoogleMaps(key) {
  if (typeof window === "undefined") return Promise.resolve(false);

  if (window.google?.maps) return Promise.resolve(true);

  if (window.__googleMapsPromise) return window.__googleMapsPromise;

  window.__googleMapsPromise = new Promise((resolve, reject) => {
    try {
      const existing = document.querySelector('script[data-google-maps="true"]');
      if (existing) {
        // If script exists, wait for google.maps to appear.
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

  const g = typeof window !== "undefined" ? window.google : null;
  return {
    url: `data:image/svg+xml,${svg}`,
    scaledSize: g?.maps ? new g.maps.Size(28, 36) : undefined,
    anchor: g?.maps ? new g.maps.Point(14, 36) : undefined,
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

function fmtDateLocal(d) {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString();
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

export default function WellsMap({
  wells = [],
  expiringWindowDays = 90,
  expiringOnly = false,
  onVisibleWellsChange, // ✅ NEW
}) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState("");

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // ✅ One-time loader
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

  const mapped = useMemo(() => {
    const items = (wells || [])
      .map((w) => {
        const ll = parseLatLng(w.wellhead_coords);
        if (!ll) return null;

        // ✅ Use “best expiration field”
        const exp =
          w.current_expires_at ??
          w.latest_expires_at ??
          w.expiration_date ??
          w.expiration ??
          null;

        const st = statusFromExpiration(exp, expiringWindowDays);

        return {
          ...w,
          latlng: ll,
          _status: st,
          _days_left: daysUntil(exp),
          _exp_for_display: exp,
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

    // Init once
    if (!mapObjRef.current) {
      const first = mapped[0]?.latlng || { lat: 32.0, lng: -103.0 }; // Permian-ish fallback

      mapObjRef.current = new window.google.maps.Map(mapRef.current, {
        center: first,
        zoom: mapped.length ? 7 : 6,

        // ✅ Satellite + labels ON by default:
        mapTypeId: "hybrid",

        // ✅ Let user switch to Map/Satellite/Hybrid:
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

      infoRef.current = new window.google.maps.InfoWindow();

      // ✅ NEW: whenever bounds change, notify dashboard which wells are visible
      mapObjRef.current.addListener("idle", () => {
        if (!onVisibleWellsChange) return;
        const bounds = mapObjRef.current?.getBounds();
        if (!bounds) return;

        const visibleApis = mapped
          .filter((w) => bounds.contains(new window.google.maps.LatLng(w.latlng.lat, w.latlng.lng)))
          .map((w) => w.api)
          .filter(Boolean);

        onVisibleWellsChange(visibleApis);
      });
    }

    // Clear markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    for (const w of mapped) {
      const pos = new window.google.maps.LatLng(w.latlng.lat, w.latlng.lng);
      bounds.extend(pos);

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
        const lastTest = escapeHtml(fmtDateLocal(w.last_test_date));
        const exp = escapeHtml(fmtDateLocal(w._exp_for_display));
        const daysLeft = w._days_left;

        const daysText =
          typeof daysLeft === "number"
            ? daysLeft < 0
              ? `${Math.abs(daysLeft)} days overdue`
              : `${daysLeft} days left`
            : "—";

        const wellHref = `/wells/${encodeURIComponent(w.api || "")}`;

        const jobHref = `/jobs/new?api=${encodeURIComponent(w.api || "")}&lease_well_name=${encodeURIComponent(
          w.lease_well_name || ""
        )}&company_name=${encodeURIComponent(w.company_name || "")}`;

        const html = `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 260px;">
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px;">
              <a href="${wellHref}" style="color:#111827; text-decoration:underline;">${name}</a>
            </div>

            <div style="font-size: 12px; color: #374151; margin-bottom: 8px;">
              <div><span style="color:#6B7280;">API:</span> <span style="font-family: ui-monospace;">${api}</span></div>
              <div><span style="color:#6B7280;">Company:</span> ${company}</div>
              <div><span style="color:#6B7280;">Last test:</span> ${lastTest}</div>
              <div><span style="color:#6B7280;">Expires:</span> ${exp}</div>
              <div><span style="color:#6B7280;">Status:</span> ${escapeHtml(daysText)}</div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <a href="${jobHref}" style="
                display:inline-block; padding:8px 10px; border-radius:12px;
                background:#2f4f4f; color:white; text-decoration:none; font-size:12px;
              ">Request Test</a>

              <a href="${wellHref}" style="
                display:inline-block; padding:8px 10px; border-radius:12px;
                border:1px solid #D1D5DB; color:#111827; text-decoration:none; font-size:12px;
              ">View Well</a>
            </div>
          </div>
        `;

        infoRef.current.setContent(html);
        infoRef.current.open(mapObjRef.current, marker);
      });

      markersRef.current.push(marker);
    }

    if (mapped.length) {
      mapObjRef.current.fitBounds(bounds, 40);
    }

    // ✅ NEW: if no wells, report empty visible set
    if (!mapped.length && onVisibleWellsChange) {
      onVisibleWellsChange([]);
    }
  }, [ready, mapped, onVisibleWellsChange]);

  if (!key) {
    return (
      <div className="bg-white border rounded-2xl p-4 text-sm text-red-600">
        Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Add it in your env vars to enable the dashboard map.
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
        <div className="font-semibold">Wells Map</div>
        <div className="text-xs text-gray-500">
          Showing {mapped.length} well{mapped.length === 1 ? "" : "s"}{" "}
          {expiringOnly ? "(expiring/expired only)" : ""}
        </div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: 420 }} />
    </div>
  );
}
