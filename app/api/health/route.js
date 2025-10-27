// app/api/health/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  try {
    const r = await q("SELECT now() as server_time");
    return NextResponse.json({ ok: true, server_time: r.rows[0].server_time }, { status: 200 });
  } catch (e) {
    console.error("GET /api/health error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "DB error" }, { status: 500 });
  }
}
