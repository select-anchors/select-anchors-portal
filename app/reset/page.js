"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [tokenState, setTokenState] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount, read ?token=... from URL and store it
  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setTokenState(t);
  }, [searchParams]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    // Belt + suspenders: read token again from URL on submit
    const tokenFromUrl = searchParams.get("token");
    const token = tokenState || tokenFromUrl;

    if (!token) {
      setMsg("Missing reset token in URL.");
      return;
    }

    if (!password || password.length < 6) {
      setMsg("Please enter a password of at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      let j = {};
      try {
        j = await res.json();
      } catch (err) {
        // If it wasn't valid JSON, just leave j empty
      }

      if (!res.ok) {
        setMsg(j.error || "Unable to reset password.");
      } else {
        setMsg("Password updated successfully! Redirecting…");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (e) {
      setMsg("Unexpected error while contacting the server.");
    } finally {
      setLoading(false);
    }
  }

  const displayToken = tokenState || searchParams.get("token");

  return (
    <div className="container py-10 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

      {!displayToken ? (
        <div className="text-red-600">
          Missing or invalid reset token. Please open the reset link from your email again.
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
