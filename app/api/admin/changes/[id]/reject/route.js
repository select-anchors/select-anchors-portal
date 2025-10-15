// app/api/admin/changes/[id]/reject/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function POST(req, { params }) {
  const { id } = params;
  const { reason } = await req.json().catch(() => ({}));
  await q(
    `update pending_changes
     set status='rejected', decided_at=now(), reason=$2
     where id=$1 and status='pending'`,
    [id, reason || null]
  );
  return NextResponse.json({ ok: true });
}
