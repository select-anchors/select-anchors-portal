// /app/account/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../app/components/NotLoggedIn";

export default function AccountPage() {
  const { data: session, status } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    monthly_expiring_summary_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);

  const EXPIRING_WINDOW_DAYS = 90;

  // ------- Load account -------
  useEffect(() => {
    if (status !== "authenticated") return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      setMsg("");

      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load account.");

        if (!mounted) return;

        setForm({
          name: json?.user?.name || "",
          email: json?.user?.email || "",
          phone: json?.user?.phone || "",
          company_name: json?.user?.company_name || "",
          monthly_expiring_summary_enabled: !!json?.user?.monthly_expiring_summary_enabled,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load account.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [status]);

  function upd(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ------- Preview count for demo -------
  // Only fetch preview when:
  // - logged in
  // - AND preference enabled (otherwise no need)
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!form.monthly_expiring_summary_enabled) {
      setPreviewCount(null);
      return;
    }

    let mounted = true;

    async function loadPreview() {
      try {
        setPreviewLoading(true);
        setError("");

        // You’ll implement this API route (super simple):
        // GET /api/notifications/preview-expiring?windowDays=90
        const res = await fetch(
          `/api/notifications/preview-expiring?windowDays=${EXPIRING_WINDOW_DAYS}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load preview.");

        if (!mounted) return;
        setPreviewCount(typeof json?.count === "number" ? json.count : 0);
      } catch (err) {
        if (!mounted) return;
        // Preview errors shouldn’t block the whole page; keep it gentle.
        setPreviewCount(null);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    }

    loadPreview();
    return () => {
      mounted = false;
    };
  }, [status, form.monthly_expiring_summary_enabled]);

  // ------- Instant-save preference toggle -------
  async function onToggleMonthlyExpiring(enabled) {
    // optimistic UI
    const previous = form.monthly_expiring_summary_enabled;
    upd("monthly_expiring_summary_enabled", enabled);

    setPrefSaving(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthly_expiring_summary_enabled: enabled,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update email preference.");

      setMsg(enabled ? "Monthly expiring reminders enabled." : "Monthly expiring reminders disabled.");
    } catch (err) {
      // rollback
      upd("monthly_expiring_summary_enabled", previous);
      setError(err?.message || "Failed to update email preference.");
    } finally {
      setPrefSaving(false);
    }
  }

  // ------- Save profile fields -------
  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save changes.");
      setMsg("Account updated.");
    } catch (err) {
      setError(err?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const previewText = useMemo(() => {
    if (!form.monthly_expiring_summary_enabled) return "Turn this on to see a preview for your account.";
    if (previewLoading) return "Loading preview…";
    if (typeof previewCount === "number") {
      return `${previewCount} well${previewCount === 1 ? "" : "s"} would be included if sent today.`;
    }
    return "Preview unavailable right now.";
  }, [form.monthly_expiring_summary_enabled, previewLoading, previewCount]);

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      {loading ? (
        <div>Loading account…</div>
      ) : (
        <>
          {/* ✅ Email Reminders (auto-save) */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Email Reminders</h2>
              <p className="text-sm text-gray-600 mt-1">
                Optional “set it and forget it” reminders to stay ahead of expiring tests.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!form.monthly_expiring_summary_enabled}
                  onChange={(e) => onToggleMonthlyExpiring(e.target.checked)}
                  disabled={prefSaving}
                />
                <div>
                  <div className="font-medium">Monthly “Expiring Soon” summary (sent on the 1st)</div>
                  <div className="text-sm text-gray-600">
                    We’ll email you a summary only when you have wells expiring in the next {EXPIRING_WINDOW_DAYS} days.
                  </div>
                  {prefSaving ? (
                    <div className="text-xs text-gray-500 mt-1">Saving preference…</div>
                  ) : null}
                </div>
              </label>

              {/* Demo Preview box */}
              <div className="rounded-xl border bg-gray-50 p-4 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <span className="text-gray-500">Status:</span>{" "}
                    <span className="font-medium">
                      {form.monthly_expiring_summary_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Schedule:</span>{" "}
                    <span className="font-medium">1st of each month</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Window:</span>{" "}
                    <span className="font-medium">{EXPIRING_WINDOW_DAYS} days</span>
                  </div>
                </div>

                <div className="mt-3 text-gray-700">{previewText}</div>

                {form.monthly_expiring_summary_enabled ? (
                  <div className="mt-2 text-xs text-gray-500">
                    This is an automated email that only sends when there are wells in that window.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ✅ Account form */}
          <form onSubmit={onSubmit} className="bg-white border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={form.name}
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Cell phone</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={form.phone}
                onChange={(e) => upd("phone", e.target.value)}
                placeholder="e.g. 555-555-5555"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Company</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-gray-50"
                value={form.company_name}
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                If this company is wrong, contact Select Anchors to update it.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
