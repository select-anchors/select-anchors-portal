"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Pull token from ?token=...
  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (!token) {
      setMsg("Missing reset token in URL.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const j = await res.json();

      if (!res.ok) {
        setMsg(j.error || "Unable to reset password.");
      } else {
        setMsg("Password updated successfully! Redirecting…");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (e) {
      setMsg("Unexpected error.");
    }

    setLoading(false);
  }

  return (
    <div className="container py-10 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

      {!token ? (
        <div className="text-red-600">
          Missing or invalid reset token. Please check your email link again.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {msg && <div className="text-sm">{msg}</div>}

          <div>
            <label className="block mb-1">New Password</label>
            <input
              type="password"
              className="w-full border rounded p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
