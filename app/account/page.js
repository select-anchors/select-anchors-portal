"use client";

export const dynamic = "force-dynamic";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState("");

  if (status === "loading") return <div className="container py-10">Loading…</div>;
  if (!session) return <div className="container py-10">Please log in.</div>;

  const user = session.user;

  async function sendReset() {
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) throw new Error("Failed to send reset email");
      setMsg("If your email is on file, a reset link was sent.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <div className="bg-white border rounded-2xl p-6 grid md:grid-cols-2 gap-6">
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
          <div className="font-medium">{user.role}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={sendReset}
          className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50"
        >
          Email me a password reset link
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90"
        >
          Sign out
        </button>
        {msg && <div className="text-sm self-center">{msg}</div>}
      </div>
    </div>
  );
}
