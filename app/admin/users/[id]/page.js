"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ManageUser() {
  const { id } = useParams();
  const router = useRouter();
  const [user,setUser]=useState(null);
  const [role,setRole]=useState("customer");
  const [msg,setMsg]=useState("");

  useEffect(()=> {
    (async ()=>{
      const list = await fetch("/api/admin/users").then(r=>r.json());
      const u = list.users.find(x=>x.id===id);
      setUser(u); setRole(u?.role || "customer");
    })();
  }, [id]);

  if (!user) return <div className="container py-8">Loading…</div>;

  async function saveRole(){
    setMsg("");
    const r = await fetch(`/api/admin/users/${id}`, {
      method:"PATCH",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify({ role })
    });
    setMsg(r.ok ? "Saved" : "Error saving");
  }

  async function sendReset(){
    setMsg("");
    const r = await fetch(`/api/admin/users/${id}/send-reset`, { method:"POST" });
    setMsg(r.ok ? "Reset email sent" : "Could not send reset");
  }

  async function remove(){
    if (!confirm("Delete this user?")) return;
    const r = await fetch(`/api/admin/users/${id}`, { method:"DELETE" });
    if (r.ok) router.push("/admin/users");
    else setMsg("Delete failed");
  }

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Manage user</h1>
      <div className="bg-white border rounded-2xl p-6 space-y-3">
        <div><span className="text-gray-600">Email:</span> {user.email}</div>
        <div className="flex items-center gap-3">
          <label className="text-gray-600">Role</label>
          <select className="border rounded p-2" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={saveRole} className="px-3 py-2 rounded bg-[#2f4f4f] text-white">Save</button>
        </div>

        <div className="flex gap-3">
          <button onClick={sendReset} className="px-3 py-2 rounded border">Send password reset</button>
          <button onClick={remove} className="px-3 py-2 rounded border text-red-600">Delete user</button>
        </div>

        {msg && <div className="text-sm text-gray-700">{msg}</div>}
      </div>
    </div>
  );
}
