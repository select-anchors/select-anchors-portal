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

// GET /api/wells  -> list wells
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id;

  try {
    // ✅ Compute "best" dates from wells OR the current test row
    // (So Neon edits to well_tests show immediately too.)
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

        -- also return explicit fields if you want them in UI
        TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS current_expires_at

      FROM wells w
      LEFT JOIN well_tests t ON t.id = w.current_test_id
    `;

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

    const { rows } = await q(
      `
      ${baseSelect}
      WHERE w.customer_id = $1
      ORDER BY w.id DESC, w.lease_well_name ASC
      LIMIT 500
      `,
      [userId]
    );

    return noStoreJson(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}
