import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const r = await sql`select now() as now`;
    return NextResponse.json({ ok: true, dbTime: r.rows[0].now });
  } catch (e) {
    console.error("HEALTH DB ERROR:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
