// app/api/stats/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

async function safeCount(sql, params = []) {
  try {
    const { rows } = await q(sql, params);
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
    const pendingChanges = await safeCount(`SELECT COUNT(*) FROM changes WHERE status = 'pending'`);

    // ✅ upcomingTests uses COALESCE(wells.current_expires_at, well_tests.expires_at)
    const upcomingTests = await safeCount(`
      SELECT COUNT(*)
      FROM wells w
      LEFT JOIN well_tests t ON t.id = w.current_test_id
      WHERE COALESCE(w.current_expires_at, t.expires_at) IS NOT NULL
        AND COALESCE(w.current_expires_at, t.expires_at) <= (CURRENT_DATE + INTERVAL '90 days')
    `);

    return noStoreJson({ wells, users, pendingChanges, upcomingTests });
  } catch (e) {
    return noStoreJson({ wells: 0, users: 0, pendingChanges: 0, upcomingTests: 0 }, { status: 200 });
  }
}
