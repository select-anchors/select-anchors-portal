// app/api/stats/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// Helper that returns 0 if the query/table/column doesn't exist yet
async function safeCount(sql) {
  try {
    const { rows } = await q(sql);
    // accept count as text or int
    const val = rows?.[0]?.count ?? rows?.[0]?.c ?? 0;
    return typeof val === "string" ? parseInt(val, 10) : Number(val) || 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  // Always-present counts
  const totalWells = await safeCount(`SELECT COUNT(*) AS count FROM wells;`);
  const totalUsers = await safeCount(`SELECT COUNT(*) AS count FROM users;`);

  // Optional tables/columns (won’t break if not created yet)
  const pendingChanges = await safeCount(`
    SELECT COUNT(*) AS count
    FROM changes
    WHERE status = 'pending';
  `);

  const upcomingTests = await safeCount(`
    SELECT COUNT(*) AS count
    FROM wells
    WHERE
      (expires_ne IS NOT NULL AND expires_ne <= NOW() + INTERVAL '30 days') OR
      (expires_nw IS NOT NULL AND expires_nw <= NOW() + INTERVAL '30 days') OR
      (expires_se IS NOT NULL AND expires_se <= NOW() + INTERVAL '30 days') OR
      (expires_sw IS NOT NULL AND expires_sw <= NOW() + INTERVAL '30 days');
  `);

  return NextResponse.json({
    wells: totalWells,
    users: totalUsers,
    pendingChanges,
    upcomingTests,
  });
}
