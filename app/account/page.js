// app/account/page.js
"use client";

export const dynamic = "force-dynamic";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();

  const [resetMsg, setResetMsg] = useState("");

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  if (status === "loading") {
    return <div className="container py-10">Loading…</div>;
  }
  if (!session) {
    return <div className="container py-10">Please log in.</div>;
  }

  const user = session.user;

  async function sendReset() {
    setResetMsg("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) throw new Error("Failed to send reset email");
      setResetMsg("If your email is on file, a reset link was sent.");
    } catch (e) {
      setResetMsg(e.message);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwErr("Please fill out all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwErr("New password and confirmation do not match.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const j = await res.json();

      if (!res.ok) {
        throw new Error(j?.error || "Could not change password.");
      }

      setPwMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      {/* Basic profile info */}
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

      {/* Reset link + sign out */}
      <div className="flex flex-wrap gap-3 items-center">
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
        {resetMsg && <div className="text-sm">{resetMsg}</div>}
      </div>

      {/* Change password card */}
      <div className="bg-white border rounded-2xl p-6 max-w-lg space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="text-sm text-gray-600">
          Update your password while you&apos;re signed in.
        </p>

        {pwErr && <div className="text-sm text-red-600">{pwErr}</div>}
        {pwMsg && <div className="text-sm text-green-700">{pwMsg}</div>}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className="w-full border rounded-md px-3 py-2 pr-16"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 text-xs px-2 rounded-md border bg-white hover:bg-gray-50"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full border rounded-md px-3 py-2 pr-16"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 text-xs px-2 rounded-md border bg-white hover:bg-gray-50"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full border rounded-md px-3 py-2 pr-16"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            disabled={pwSaving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {pwSaving ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
