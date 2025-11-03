"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading")
    return <div className="container py-10 text-gray-600">Loading your account…</div>;

  if (!session)
    return (
      <div className="container py-10">
        <p className="text-gray-700 mb-4">You must be logged in to view your account.</p>
        <a
          href="/login"
          className="inline-block px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50"
        >
          Go to Login
        </a>
      </div>
    );

  const user = session.user;

  async function sendReset() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      setLoading(false);

      if (!res.ok) throw new Error("Could not send reset link");
      setMsg("If this email exists in our system, a reset link has been sent.");
    } catch (e) {
      setLoading(false);
      setMsg(e.message || "Something went wrong.");
    }
  }

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <div className="bg-white border rounded-2xl p-6 grid md:grid-cols-2 gap-6 shadow-sm">
        <div>
          <div className="text-sm text-gray-600">Name</div>
          <div className="font-medium">{user.name || "—"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">Email</div>
          <div className="font-medium break-all">{user.email}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">Role</div>
          <div className="font-medium capitalize">{user.role}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={sendReset}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Email password reset link"}
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          Sign out
        </button>

        {msg && <div className="text-sm text-gray-700 self-center">{msg}</div>}
      </div>
    </div>
  );
}
