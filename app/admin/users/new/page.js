"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function NewUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("customer");
  const [isActive, setIsActive] = useState(true);
  const [sendReset, setSendReset] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
    if (session && !isAdmin) router.replace("/dashboard");
  }, [session, status, isAdmin, router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, role, is_active: isActive, sendReset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");
      router.replace("/admin/users");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New User</h1>
      {err && <div className="text-red-600 mb-4">{err}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Role</label>
          <select className="w-full border rounded px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="admin">admin</option>
            <option value="employee">employee</option>
            <option value="customer">customer</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input id="active" type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} />
          <label htmlFor="active">Active</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="sendReset" type="checkbox" checked={sendReset} onChange={e=>setSendReset(e.target.checked)} />
          <label htmlFor="sendReset">Email a password-reset link after creating</label>
        </div>

        <div className="flex gap-3">
          <button disabled={saving} className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white">
            {saving ? "Creating…" : "Create User"}
          </button>
          <a href="/admin/users" className="px-4 py-2 rounded-xl border">Cancel</a>
        </div>
      </form>
    </div>
  );
}
