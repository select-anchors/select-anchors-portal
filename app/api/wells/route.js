// app/api/wells/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";
import { hasPermission } from "../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canViewAllWells = hasPermission(session, "can_view_all_wells");
  const companyId = session.user.company_id || null;

  try {
    const baseSelect = `
      SELECT
        w.id,
        w.company_id,
        w.lease_well_name,
        w.api,
        w.wellhead_coords,
        w.county,
        w.state,
        COALESCE(w.company_name, c.name, '') AS company_name,
        w.company_man_name,

        TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS expiration_date,

        TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS current_expires_at

      FROM wells w
      LEFT JOIN well_tests t ON t.id = w.current_test_id
      LEFT JOIN companies c ON c.id = w.company_id
    `;

    if (canViewAllWells) {
      const { rows } = await q(
        `
        ${baseSelect}
        ORDER BY w.id DESC, w.lease_well_name ASC
        LIMIT 500
        `
      );

      return noStoreJson(rows);
    }

    if (!companyId) {
      return noStoreJson([]);
    }

    const { rows } = await q(
      `
      ${baseSelect}
      WHERE w.company_id = $1
      ORDER BY w.id DESC, w.lease_well_name ASC
      LIMIT 500
      `,
      [companyId]
    );

    return noStoreJson(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}
