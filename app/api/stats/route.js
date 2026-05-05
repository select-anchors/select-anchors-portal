// app/api/stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

async function safeCount(sql, params = []) {
  try {
    const { rows } = await q(sql, params);
    return Number(rows?.[0]?.count || 0);
  } catch (err) {
    console.error("[STATS_COUNT_ERROR]", err?.message || err);
    return 0;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "admin";
    const isEmployee = session.user.role === "employee";

    const canViewAllWells =
      isAdmin || isEmployee || hasPermission(session, "can_view_all_wells");

    const canManageUsers =
      isAdmin || hasPermission(session, "can_manage_users");

    const canApproveChanges =
      isAdmin || hasPermission(session, "can_approve_changes");

    const companyId = session.user.company_id || null;

    if (canViewAllWells) {
      const wells = await safeCount(`SELECT COUNT(*) FROM wells`);

      const expiringSoonWells = await safeCount(`
        SELECT COUNT(*)
        FROM wells
        WHERE current_expires_at IS NOT NULL
          AND current_expires_at >= CURRENT_DATE
          AND current_expires_at <= CURRENT_DATE + INTERVAL '90 days'
      `);

      const expiredWells = await safeCount(`
        SELECT COUNT(*)
        FROM wells
        WHERE current_expires_at IS NOT NULL
          AND current_expires_at < CURRENT_DATE
      `);

      const users = canManageUsers
        ? await safeCount(`
            SELECT COUNT(*)
            FROM users
            WHERE COALESCE(is_active, TRUE) = TRUE
          `)
        : 0;

      const pendingChanges = canApproveChanges
        ? await safeCount(`
            SELECT COUNT(*)
            FROM pending_changes
            WHERE status = 'pending'
          `)
        : 0;

      return noStoreJson({
        wells,
        users,
        pendingChanges,
        upcomingTests: 0,
        expiringSoonWells,
        expiredWells,
      });
    }

    if (!companyId) {
      return noStoreJson({
        wells: 0,
        users: 0,
        pendingChanges: 0,
        upcomingTests: 0,
        expiringSoonWells: 0,
        expiredWells: 0,
      });
    }

    const wells = await safeCount(
      `
      SELECT COUNT(*)
      FROM wells
      WHERE company_id = $1
      `,
      [companyId]
    );

    const expiringSoonWells = await safeCount(
      `
      SELECT COUNT(*)
      FROM wells
      WHERE company_id = $1
        AND current_expires_at IS NOT NULL
        AND current_expires_at >= CURRENT_DATE
        AND current_expires_at <= CURRENT_DATE + INTERVAL '90 days'
      `,
      [companyId]
    );

    const expiredWells = await safeCount(
      `
      SELECT COUNT(*)
      FROM wells
      WHERE company_id = $1
        AND current_expires_at IS NOT NULL
        AND current_expires_at < CURRENT_DATE
      `,
      [companyId]
    );

    return noStoreJson({
      wells,
      users: 0,
      pendingChanges: 0,
      upcomingTests: 0,
      expiringSoonWells,
      expiredWells,
    });
  } catch (e) {
    console.error("GET /api/stats error:", e);
    return noStoreJson(
      {
        wells: 0,
        users: 0,
        pendingChanges: 0,
        upcomingTests: 0,
        expiringSoonWells: 0,
        expiredWells: 0,
      },
      { status: 200 }
    );
  }
}
