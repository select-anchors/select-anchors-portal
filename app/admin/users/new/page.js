"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewUser() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("customer");
  const [err,setErr]=useState("");
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/users", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({ email, password, role })
    });
    if (r.ok) router.push("/admin/users");
    else setErr((await r.json()).error || "Error");
  }

  return (
    <div className="container py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Create user</h1>
      {err && <div className="text-red-600 mb-3">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Temp password" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="w-full border p-2 rounded" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="customer">Customer</option>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex gap-2">
          <button className="rounded-xl px-4 py-2 bg-[#2f4f4f] text-white">Create</button>
        </div>
      </form>
    </div>
  );
}
