"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password
    });
    if (res?.error) setErr(res.error);
    else router.push("/dashboard");
  }

  return (
    <div className="container py-10">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {err && <div className="text-red-600">{err}</div>}
        <div>
          <label>Email</label>
          <input className="w-full" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" className="w-full" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div className="flex justify-between items-center">
          <button className="btn">Sign in</button>
          <a href="/forgot" className="text-sm underline">Forgot password?</a>
        </div>
      </form>
    </div>
  );
}
