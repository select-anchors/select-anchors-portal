// app/api/stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
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
    console.error("Stats query failed:", err?.message || err);
    return 0;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id;

  const EXPIRING_WINDOW_DAYS = 90;

  // ✅ This is the SAME rule used by /api/wells now
  const bestExpiresExpr = `COALESCE(current_expires_at, expiration_date)`;

  try {
    const isStaff = role === "admin" || role === "employee";

    const wells = isStaff
      ? await safeCount(`SELECT COUNT(*) FROM wells`)
      : await safeCount(`SELECT COUNT(*) FROM wells WHERE customer_id = $1`, [userId]);

    const users = isStaff ? await safeCount(`SELECT COUNT(*) FROM users`) : 0;

    const pendingChanges = isStaff
      ? await safeCount(`SELECT COUNT(*) FROM changes WHERE status = 'pending'`)
      : 0;

    const upcomingTests = isStaff
      ? await safeCount(
          `
          SELECT COUNT(*) FROM wells
          WHERE ${bestExpiresExpr} IS NOT NULL
            AND ${bestExpiresExpr}::date >= CURRENT_DATE
            AND ${bestExpiresExpr}::date <= (CURRENT_DATE + $1::int)
          `,
          [EXPIRING_WINDOW_DAYS]
        )
      : await safeCount(
          `
          SELECT COUNT(*) FROM wells
          WHERE customer_id = $1
            AND ${bestExpiresExpr} IS NOT NULL
            AND ${bestExpiresExpr}::date >= CURRENT_DATE
            AND ${bestExpiresExpr}::date <= (CURRENT_DATE + $2::int)
          `,
          [userId, EXPIRING_WINDOW_DAYS]
        );

    return noStoreJson({
      wells,
      users,
      pendingChanges,
      upcomingTests,
    });
  } catch (e) {
    return noStoreJson(
      { wells: 0, users: 0, pendingChanges: 0, upcomingTests: 0 },
      { status: 200 }
    );
  }
}
