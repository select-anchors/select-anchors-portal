// /app/reset/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // token from the URL: /reset?token=xxxx
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk(false);

    if (!token) {
      setError("Missing or invalid reset token. Please request a new link.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Could not reset password.");
      } else {
        setOk(true);
        // optional: after a couple seconds, go back to login
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      console.error("[RESET][CLIENT] Error:", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    // If someone visits /reset without ?token=...
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f7]">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm p-10">
          <h1 className="text-3xl font-bold text-[#123524] mb-4">
            Reset Password
          </h1>
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            This reset link is missing a token or is invalid. Please go back to
            the login page and request a new reset email.
          </div>
          <div className="mt-6">
            <a href="/login" className="text-sm text-[#123524] underline">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f5f7]">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm p-10">
        <h1 className="text-3xl font-bold text-[#123524] mb-6">
          Reset Password
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {ok && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            Password updated. Redirecting you to login…
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Hidden field just so we can visually confirm token exists if needed */}
          <input type="hidden" value={token} readOnly />

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123524]/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123524]/40"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[#123524] text-white rounded-2xl py-2.5 text-sm font-medium hover:bg-[#0f2a1d] disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-[#123524] underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
