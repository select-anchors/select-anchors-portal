// app/api/stats/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

async function safeCount(sql) {
  try {
    const { rows } = await q(sql);
    const val = rows?.[0]?.count ?? 0;
    return Number(val) || 0;
  } catch (err) {
    console.error("Stats query failed:", err.message);
    return 0;
  }
}

export async function GET() {
  try {
    const wells = await safeCount(`SELECT COUNT(*) FROM wells`);
    const users = await safeCount(`SELECT COUNT(*) FROM users`);
    const pendingChanges = await safeCount(`
      SELECT COUNT(*) FROM changes WHERE status = 'pending'
    `);

    const upcomingTests = await safeCount(`
      SELECT COUNT(*) FROM wells
      WHERE current_expires_at IS NOT NULL
        AND current_expires_at <= NOW() + INTERVAL '30 days'
    `);

    return NextResponse.json({
      wells,
      users,
      pendingChanges,
      upcomingTests,
    });
  } catch (e) {
    // ABSOLUTE fallback — dashboard must not crash
    return NextResponse.json(
      { wells: 0, users: 0, pendingChanges: 0, upcomingTests: 0 },
      { status: 200 }
    );
  }
}
