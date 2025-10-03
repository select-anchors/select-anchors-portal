"use client";
import { useState } from "react";

export default function AdminWellsPage() {
  const [customer, setCustomer] = useState("");
  const [api, setApi] = useState("");
  const [county, setCounty] = useState("");
  const [needBy, setNeedBy] = useState("");
  const [expiration, setExpiration] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/wells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, api, county, needBy, expiration }),
    });
    if (res.ok) {
      alert("Well added!");
      setCustomer(""); setApi(""); setCounty(""); setNeedBy(""); setExpiration("");
    } else {
      alert("Error adding well");
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Add New Well</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input className="border p-2 rounded" value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer Name" required />
        <input className="border p-2 rounded" value={api} onChange={e=>setApi(e.target.value)} placeholder="API Number" required />
        <input className="border p-2 rounded" value={county} onChange={e=>setCounty(e.target.value)} placeholder="County" />
        <input className="border p-2 rounded" type="date" value={needBy} onChange={e=>setNeedBy(e.target.value)} placeholder="Need By" />
        <input className="border p-2 rounded" type="date" value={expiration} onChange={e=>setExpiration(e.target.value)} placeholder="Expiration Date" />
        <button type="submit" className="btn btn-primary">Save Well</button>
      </form>
    </div>
  );
}
