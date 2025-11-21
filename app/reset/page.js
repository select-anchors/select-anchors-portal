"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing reset link.");
    }
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) return;

    if (!password || password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Could not reset password.");
      }

      setStatus("success");
      setMessage("Your password has been reset. You can now log in.");

      // Optional: auto-redirect after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Could not reset password.");
    }
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Set a new password</h1>

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

        {!token ? (
          <p className="text-sm text-gray-700">
            The reset link is invalid or has expired. Please request a new one
            from the <a href="/forgot" className="underline">Forgot password</a> page.
          </p>
        ) : (
          <>
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
                  disabled={status === "loading" || status === "success"}
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

            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" ? "Saving…" : "Reset password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
