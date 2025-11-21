"use client";

import { useState } from "react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Unable to send reset link.");
      }

      setStatus("success");
      setMessage(
        "If that email exists in our system, a reset link has been sent."
      );
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Forgot password</h1>

        {message && (
          <div
            className={
              status === "error"
                ? "text-sm text-red-600"
                : "text-sm text-green-700"
            }
          >
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
