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
    console.error("Stats query failed:", err?.message || err);
    return 0;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const canViewAllWells = hasPermission(session, "can_view_all_wells");
    const canManageUsers = hasPermission(session, "can_manage_users");
    const canApproveChanges = hasPermission(session, "can_approve_changes");
    const companyId = session.user.company_id || null;

    if (canViewAllWells) {
      const wells = await safeCount(`SELECT COUNT(*) FROM wells`);

      const users = canManageUsers
        ? await safeCount(`SELECT COUNT(*) FROM users WHERE COALESCE(is_active, TRUE) = TRUE`)
        : 0;

      const pendingChanges = canApproveChanges
        ? await safeCount(`SELECT COUNT(*) FROM pending_changes WHERE status = 'pending'`)
        : 0;

      return noStoreJson({
        wells,
        users,
        pendingChanges,
        upcomingTests: 0,
      });
    }

    if (!companyId) {
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
      FROM wells
      WHERE company_id = $1
      `,
      [companyId]
    );

    return noStoreJson({
      wells,
      users: 0,
      pendingChanges: 0,
      upcomingTests: 0,
    });
  } catch (e) {
    console.error("GET /api/stats error:", e);
    return noStoreJson(
      { wells: 0, users: 0, pendingChanges: 0, upcomingTests: 0 },
      { status: 200 }
    );
  }
}
