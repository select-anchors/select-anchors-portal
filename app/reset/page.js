// app/reset/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!token) {
      setErr("Missing or invalid reset link.");
      return;
    }

    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const j = await res.json();

      if (!res.ok) {
        throw new Error(j?.error || "Could not reset password.");
      }

      setDone(true);
      setMsg("Password updated successfully. You can now sign in.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="container py-10">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-2">Reset password</h1>
          <p className="text-sm text-red-600">
            Invalid or missing reset token. Please request a new reset link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Choose a new password</h1>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-700">{msg}</div>}

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full border rounded-md px-3 py-2 pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 text-xs px-2 rounded-md border bg-white hover:bg-gray-50"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full border rounded-md px-3 py-2 pr-16"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 text-xs px-2 rounded-md border bg-white hover:bg-gray-50"
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          disabled={submitting || done}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : done ? "Password updated" : "Reset password"}
        </button>

        {done && (
          <button
            type="button"
            className="block mt-2 text-sm underline"
            onClick={() => router.push("/login")}
          >
            Go to login
          </button>
        )}
      </form>
    </div>
  );
}
