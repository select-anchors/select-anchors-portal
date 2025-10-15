// app/api/admin/changes/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// List pending
export async function GET() {
  const { rows } = await q(
    `select id, kind, submitted_by, status, payload, created_at
     from pending_changes where status='pending'
     order by created_at asc`
  );
  return NextResponse.json(rows);
}
