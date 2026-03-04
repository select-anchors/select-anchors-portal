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

  // ✅ Best-field logic (works even if Neon edits either column)
  // NOTE: This assumes you have BOTH fields available in your DB.
  // If you only have current_expires_at/current_tested_at, COALESCE still works fine.
  const selectSql = `
    SELECT
      id,
      lease_well_name,
      api,
      wellhead_coords,
      company_name,
      company_man_name,

      -- "best" tested date
      TO_CHAR(
        COALESCE(current_tested_at, last_test_date),
        'YYYY-MM-DD'
      ) AS last_test_date,

      -- "best" expiration date (THIS is what your UI should use everywhere)
      TO_CHAR(
        COALESCE(current_expires_at, expiration_date),
        'YYYY-MM-DD'
      ) AS expiration_date

    FROM wells
  `;

  try {
    // staff sees all
    if (role === "admin" || role === "employee") {
      const { rows } = await q(
        `
        ${selectSql}
        ORDER BY id DESC, lease_well_name ASC
        LIMIT 500
        `
      );
      return noStoreJson(rows);
    }

    // customers only see their wells
    const { rows } = await q(
      `
      ${selectSql}
      WHERE customer_id = $1
      ORDER BY id DESC, lease_well_name ASC
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

// POST /api/wells -> create
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      lease_well_name,
      api,
      wellhead_coords,
      company_name,
      company_email,
      company_phone,
      company_address,
      company_man_name,
      company_man_email,
      company_man_phone,
      previous_anchor_work,
      directions_other_notes,
      previous_anchor_company,
      need_by,
      status = "pending",
      customer,
      customer_id,
      county,
      state,
    } = body;

    const { rows } = await q(
      `
      INSERT INTO wells (
        lease_well_name, api, wellhead_coords,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        need_by, status,
        customer, customer_id,
        county, state
      ) VALUES (
        $1,$2,$3,
        $4,$5,$6,$7,
        $8,$9,$10,
        $11,$12,$13,
        $14,$15,
        $16,$17,
        $18,$19
      )
      RETURNING id, api
      `,
      [
        lease_well_name ?? null,
        api ?? null,
        wellhead_coords ?? null,
        company_name ?? null,
        company_email ?? null,
        company_phone ?? null,
        company_address ?? null,
        company_man_name ?? null,
        company_man_email ?? null,
        company_man_phone ?? null,
        previous_anchor_work ?? null,
        directions_other_notes ?? null,
        previous_anchor_company ?? null,
        need_by ?? null,
        status ?? "pending",
        customer ?? null,
        customer_id ?? null,
        county ?? null,
        state ?? null,
      ]
    );

    return noStoreJson(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 400 });
  }
}
