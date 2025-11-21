// app/login/page.js
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function mapErrorMessage(raw) {
  if (!raw) return "";

  // Default NextAuth error for bad credentials
  if (raw === "CredentialsSignin") {
    return "Invalid email or password.";
  }

  // You can add more mappings here if needed
  // e.g. if you ever throw custom errors from authorize()
  // if (raw === "UserDisabled") return "Your account is disabled. Contact support.";

  return "Unable to sign in. Please check your details and try again.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErr(mapErrorMessage(res.error));
      } else {
        // Successful login – send them to dashboard
        router.push("/dashboard");
      }
    } catch (e) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <div>
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            type="email"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full border rounded-md px-3 py-2 pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

        <div className="flex justify-between items-center">
          <button
            type="submit"
            disabled={submitting}
            className="btn px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
          <a href="/forgot" className="text-sm underline">
            Forgot password?
          </a>
        </div>
      </form>
    </div>
  );
}
