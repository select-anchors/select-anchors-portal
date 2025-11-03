// /app/forgot/page.js
"use client";

import { useState } from "react";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Unable to send reset link. Please try again later.");
      }

      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <div className="container py-10 max-w-md mx-auto text-center">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h1 className="text-xl font-semibold mb-3">Check your email</h1>
          <p className="text-gray-600">
            If the email address exists, a reset link has been sent to{" "}
            <span className="font-medium">{email}</span>.
          </p>
        </div>
      </div>
    );

  return (
    <div className="container py-10">
      <form
        onSubmit={submit}
        className="max-w-md mx-auto space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
      >
        <h1 className="text-2xl font-bold">Forgot Password</h1>

        {error && (
          <div className="text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-700">Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f4f4f]/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-50 w-full"
        >
          {loading ? "Sending..." : "Send Reset Link"}
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
