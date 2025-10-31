"use client";
import { useState } from "react";

export default function Forgot() {
  const [email,setEmail]=useState("");
  const [ok,setOk]=useState(false);

  async function submit(e){
    e.preventDefault();
    await fetch("/api/auth/forgot", {method:"POST", body: JSON.stringify({email}), headers:{"content-type":"application/json"}});
    setOk(true);
  }

  if (ok) return <div>Check your email for a reset link (If the address exists).</div>;

  return (
    <form onSubmit={submit} className="max-w-md">
      <h1>Forgot password</h1>
      <input value={email} onChange={e=>setEmail(e.target.value)} />
      <button>Send reset link</button>
    </form>
  );
}
