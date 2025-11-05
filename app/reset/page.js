// app/reset/page.js
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

export default function ResetPage() {
  const search = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => search.get("token") || "", [search]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!token) return setErr("Invalid or expired token.");
    if (password !== confirm) return setErr("Passwords do not match.");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const j = await res.json();
    if (!res.ok) return setErr(j.error || "Could not reset password.");
    setOk(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="container py-10 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">Reset Password</h1>
      {err && <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-red-700">{JSON.stringify({ error: err })}</div>}
      {ok && <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-green-700">Password updated. Redirecting…</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input type="password" className="w-full border rounded-md p-2" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm Password</label>
          <input type="password" className="w-full border rounded-md p-2" value={confirm} onChange={e=>setConfirm(e.target.value)} />
        </div>
        <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white">Update Password</button>
      </form>
      <div className="mt-4">
        <a href="/login" className="underline">Back to Login</a>
      </div>
    </div>
  );
}
