// app/api/wells/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// GET /api/wells -> list wells
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id;

  try {
    const baseSelect = `
      SELECT
        w.id,
        w.lease_well_name,
        w.api,
        w.wellhead_coords,
        w.company_name,
        w.company_man_name,

        TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS expiration_date,

        TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS current_expires_at

      FROM wells w
      LEFT JOIN well_tests t ON t.id = w.current_test_id
    `;

    // Admin + employee: all wells
    if (role === "admin" || role === "employee") {
      const { rows } = await q(
        `
        ${baseSelect}
        ORDER BY w.id DESC, w.lease_well_name ASC
        LIMIT 500
        `
      );

      return noStoreJson(rows);
    }

    // Customer: scope by the logged-in user's company_name
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
      return noStoreJson([]);
    }

    const { rows } = await q(
      `
      ${baseSelect}
      WHERE LOWER(TRIM(COALESCE(w.company_name, ''))) = LOWER(TRIM($1))
      ORDER BY w.id DESC, w.lease_well_name ASC
      LIMIT 500
      `,
      [companyName]
    );

    return noStoreJson(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}
