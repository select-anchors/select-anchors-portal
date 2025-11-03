// /app/login/page.js
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(search.get("error") ? "Please sign in to continue." : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    // Simple client-side validation
    if (!email || !password) {
      setErr("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!res) {
        setErr("Unexpected error. Please try again.");
        return;
      }

      if (res.error) {
        // Normalize common errors from Credentials provider
        const msg =
          res.error.includes("CredentialsSignin")
            ? "Invalid email or password."
            : res.error;
        setErr(msg);
        return;
      }

      // Success: send to "/" and let server-side role redirect decide
      router.push("/");
    } catch (e) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md mx-auto space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>

        {err && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            {err}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-700">Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f4f4f]/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-700">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f4f4f]/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#2f4f4f] text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <a href="/forgot" className="text-sm underline">
            Forgot password?
          </a>
        </div>
      </form>
    </div>
  );
}
