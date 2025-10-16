// /app/api/health/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await q("select now() as ts");
    return NextResponse.json({ ok: true, dbTime: res.rows[0].ts }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
