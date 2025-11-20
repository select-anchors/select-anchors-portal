"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Grab token from URL (?token=...)
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please request a new reset link.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== password2) {
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
        setError(data.error || "Could not reset password.");
        return;
      }

      setOk(true);

      // small redirect delay so user sees success
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("[RESET][ERROR] Client error:", err);
      setError("Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="container py-10">
        <div className="max-w-md bg-white border rounded-2xl p-6 space-y-3">
          <h1 className="text-2xl font-bold text-green-700">Password updated</h1>
          <p>You can now sign in with your new password.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <form
        onSubmit={onSubmit}
        className="max-w-md bg-white border rounded-2xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Reset Password</h1>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">New Password</label>
          <input
            type="password"
            className="w-full border rounded-xl px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            className="w-full border rounded-xl px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>

        {/* not required for the user, but if you want to visually confirm: */}
        {/* <div className="text-xs text-gray-500 break-all">
          Token: {token || "missing"}
        </div> */}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        <div className="pt-2 text-sm">
          <a href="/login" className="underline">
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
}
