"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Reset() {
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const [pw,setPw] = useState("");
  const [ok,setOk] = useState(false);
  const [err,setErr] = useState("");

  async function submit(e){
    e.preventDefault();
    const r = await fetch("/api/auth/reset", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ email, token, newPassword: pw })});
    if (r.ok) setOk(true);
    else { const body = await r.json(); setErr(body.error || "Error"); }
  }

  if (ok) return <div>Password reset. <a href="/login">Sign in</a></div>;

  return (
    <form onSubmit={submit} className="max-w-md">
      <h1>Reset password</h1>
      {err && <div className="text-red-600">{err}</div>}
      <div>Email: {email}</div>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="New password" />
      <button>Reset password</button>
    </form>
  );
}
