// /app/reset/page.js
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // If no token, show message
  useEffect(() => {
    if (!token) {
      setError("Missing or invalid reset link. Please request a new one.");
    }
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) return setError("Missing reset token.");
    if (!password || password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Unable to reset password. The link may be expired.");
      }

      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="container py-10 max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3">
          <h1 className="text-xl font-semibold">Password updated</h1>
          <p className="text-gray-600">You can now sign in with your new password.</p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
      >
        <h1 className="text-2xl font-bold">Reset Password</h1>

        {error && (
          <div className="text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!token && (
          <div className="text-sm text-gray-600">
            This page requires a valid reset link. Please{" "}
            <a className="underline" href="/forgot">
              request a new link
            </a>
            .
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-700">New Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f4f4f]/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={!token}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-700">Confirm Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f4f4f]/40"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            disabled={!token}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-50 w-full"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        <div className="text-sm text-center text-gray-600">
          <a href="/login" className="underline">
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
}
