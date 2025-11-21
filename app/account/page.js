"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [resetMsg, setResetMsg] = useState("");
  const [resetStatus, setResetStatus] = useState("idle");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changeStatus, setChangeStatus] = useState("idle"); // idle | loading | success | error
  const [changeMsg, setChangeMsg] = useState("");

  if (status === "loading") {
    return <div className="container py-10">Loading…</div>;
  }
  if (!session) {
    return <div className="container py-10">Please log in.</div>;
  }

  const user = session.user;

  async function sendReset() {
    setResetMsg("");
    setResetStatus("loading");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send reset email.");
      }
      setResetStatus("success");
      setResetMsg(
        "If your email is on file, a reset link was sent to your inbox."
      );
    } catch (e) {
      setResetStatus("error");
      setResetMsg(e.message || "Unable to send reset link.");
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setChangeMsg("");
    setChangeStatus("idle");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangeStatus("error");
      setChangeMsg("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setChangeStatus("error");
      setChangeMsg("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangeStatus("error");
      setChangeMsg("New password and confirmation do not match.");
      return;
    }

    setChangeStatus("loading");
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not change password.");
      }

      setChangeStatus("success");
      setChangeMsg(
        "Password updated successfully. You may need to log in again on other devices."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setChangeStatus("error");
      setChangeMsg(err.message || "Could not change password.");
    }
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Account</h1>

      {/* Basic info */}
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

      {/* Password tools */}
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* 1) Email reset link */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Reset link</h2>
          <p className="text-sm text-gray-600">
            We can email you a secure link to reset your password if you prefer.
          </p>
          <button
            onClick={sendReset}
            disabled={resetStatus === "loading"}
            className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            {resetStatus === "loading"
              ? "Sending…"
              : "Email me a password reset link"}
          </button>
          {resetMsg && (
            <div
              className={
                resetStatus === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-green-700"
              }
            >
              {resetMsg}
            </div>
          )}
        </div>

        {/* 2) Change password form */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Change password</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
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

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="w-full border rounded-md px-3 py-2 pr-16"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
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

            {changeMsg && (
              <div
                className={
                  changeStatus === "error"
                    ? "text-sm text-red-600"
                    : "text-sm text-green-700"
                }
              >
                {changeMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={changeStatus === "loading"}
              className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
            >
              {changeStatus === "loading" ? "Saving…" : "Change password"}
            </button>
          </form>
        </div>
      </div>

      <div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-4 py-2 rounded-xl border border-gray-400 bg-white hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
