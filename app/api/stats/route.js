// app/api/stats/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

async function safeCount(sql) {
  try {
    const { rows } = await q(sql);
    const val = rows?.[0]?.count ?? rows?.[0]?.c ?? 0;
    return typeof val === "string" ? parseInt(val, 10) : Number(val) || 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const totalWells = await safeCount(`SELECT COUNT(*) AS count FROM wells;`);
  const totalUsers = await safeCount(`SELECT COUNT(*) AS count FROM users;`);

  const pendingChanges = await safeCount(`
    SELECT COUNT(*) AS count
    FROM changes
    WHERE status = 'pending';
  `);

  const upcomingTests = await safeCount(`
    SELECT COUNT(*) AS count
    FROM wells
    WHERE
      (current_expires_at IS NOT NULL AND current_expires_at <= NOW() + INTERVAL '30 days');
  `);

  return NextResponse.json({
    wells: totalWells,
    users: totalUsers,
    pendingChanges,
    upcomingTests,
  });
}
