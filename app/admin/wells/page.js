// app/admin/wells/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import NotLoggedIn from "@/app/components/NotLoggedIn";

export default function AdminWellsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const editApi = searchParams.get("api");
  const isEditing = searchParams.get("edit") === "1";

  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const role = session?.user?.role;
  const canSee = role === "admin" || role === "employee";

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/wells", { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        let data = [];
        if (Array.isArray(json)) data = json;
        else if (Array.isArray(json?.wells)) data = json.wells;

        setWells(data);
      } catch (err) {
        console.error("Error loading wells (admin page):", err);
        if (mounted) setWells([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ hooks BEFORE any returns
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wells;

    return wells.filter((w) => {
      const lease = (w.lease_well_name || "").toLowerCase();
      const api = (w.api || "").toLowerCase();
      const company = (w.company_name || "").toLowerCase();
      const companyMan = (w.company_man_name || "").toLowerCase();
      return lease.includes(q) || api.includes(q) || company.includes(q) || companyMan.includes(q);
    });
  }, [query, wells]);

  const editingWell =
    isEditing && editApi ? wells.find((w) => w.api === editApi) ?? null : null;

  // ✅ returns AFTER hooks
  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;
  if (!canSee) return <div className="container py-8">Not authorized.</div>;

  return (
    <div className="container py-8 space-y-6">
      {/* ...rest of your JSX unchanged... */}
    </div>
  );
}
