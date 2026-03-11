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
    console.error("Stats query failed:", err.message);
    return 0;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role || "customer";
    const userId = session.user.id;

    if (role === "admin") {
      const wells = await safeCount(`SELECT COUNT(*) FROM wells`);
      const users = await safeCount(`SELECT COUNT(*) FROM users`);
      const pendingChanges = await safeCount(`
        SELECT COUNT(*) FROM changes WHERE status = 'pending'
      `);

      const upcomingTests = await safeCount(`
        SELECT COUNT(*)
        FROM wells w
        LEFT JOIN well_tests t ON t.id = w.current_test_id
        WHERE COALESCE(w.current_expires_at, t.expires_at) IS NOT NULL
          AND COALESCE(w.current_expires_at, t.expires_at) <= (CURRENT_DATE + INTERVAL '90 days')
      `);

      return noStoreJson({ wells, users, pendingChanges, upcomingTests });
    }

    if (role === "employee") {
      const wells = await safeCount(`SELECT COUNT(*) FROM wells`);

      const upcomingTests = await safeCount(`
        SELECT COUNT(*)
        FROM wells w
        LEFT JOIN well_tests t ON t.id = w.current_test_id
        WHERE COALESCE(w.current_expires_at, t.expires_at) IS NOT NULL
          AND COALESCE(w.current_expires_at, t.expires_at) <= (CURRENT_DATE + INTERVAL '90 days')
      `);

      return noStoreJson({
        wells,
        users: 0,
        pendingChanges: 0,
        upcomingTests,
      });
    }

    const userResult = await q(
      `
      SELECT company_name
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    const companyName = userResult.rows?.[0]?.company_name?.trim() || "";

    if (!companyName) {
      return noStoreJson({
        wells: 0,
        users: 0,
        pendingChanges: 0,
        upcomingTests: 0,
      });
    }

    const wells = await safeCount(
      `
      SELECT COUNT(*)
      FROM wells w
      WHERE LOWER(TRIM(COALESCE(w.company_name, ''))) = LOWER(TRIM($1))
      `,
      [companyName]
    );

    const upcomingTests = await safeCount(
      `
      SELECT COUNT(*)
      FROM wells w
      LEFT JOIN well_tests t ON t.id = w.current_test_id
      WHERE LOWER(TRIM(COALESCE(w.company_name, ''))) = LOWER(TRIM($1))
        AND COALESCE(w.current_expires_at, t.expires_at) IS NOT NULL
        AND COALESCE(w.current_expires_at, t.expires_at) <= (CURRENT_DATE + INTERVAL '90 days')
      `,
      [companyName]
    );

    return noStoreJson({
      wells,
      users: 0,
      pendingChanges: 0,
      upcomingTests,
    });
  } catch (e) {
    console.error("GET /api/stats error:", e);
    return noStoreJson(
      { wells: 0, users: 0, pendingChanges: 0, upcomingTests: 0 },
      { status: 200 }
    );
  }
}
