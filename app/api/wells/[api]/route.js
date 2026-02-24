// app/api/wells/[api]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

function fmtDate(col) {
  return `TO_CHAR(${col}, 'YYYY-MM-DD')`;
}

export async function GET(_req, { params }) {
  try {
    const api = decodeURIComponent(params.api);

    const { rows } = await q(
      `
      SELECT
        w.id,
        w.api,
        w.lease_well_name,
        w.company_name,
        w.company_email,
        w.company_phone,
        w.company_address,
        w.company_man_name,
        w.company_man_email,
        w.company_man_phone,

        w.customer,
        w.customer_id,
        w.county,
        w.wellhead_coords,

        w.previous_anchor_company,
        w.previous_anchor_work,
        w.directions_other_notes,

        ${fmtDate("w.need_by")}              AS need_by,
        w.managed_by_company,
        w.status,

        -- “current” fields (your denormalized, prominent dates)
        ${fmtDate("w.current_tested_at")}    AS current_tested_at,
        ${fmtDate("w.current_expires_at")}   AS current_expires_at,
        w.current_test_id,

        -- Helpful extra info (latest test + count) straight from well_tests
        t.test_count,
        ${fmtDate("t.latest_tested_at")}     AS latest_tested_at,
        ${fmtDate("t.latest_expires_at")}    AS latest_expires_at

      FROM wells w
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS test_count,
          (SELECT wt.tested_at
            FROM well_tests wt
            WHERE wt.well_api = w.api
            ORDER BY wt.tested_at DESC NULLS LAST, wt.created_at DESC
            LIMIT 1) AS latest_tested_at,
          (SELECT wt.expires_at
            FROM well_tests wt
            WHERE wt.well_api = w.api
            ORDER BY wt.tested_at DESC NULLS LAST, wt.created_at DESC
            LIMIT 1) AS latest_expires_at
      ) t ON TRUE

      WHERE w.api = $1
      LIMIT 1
      `,
      [api]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("GET /api/wells/[api] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/wells/[api] -> update well fields (NOT test dates; those come from well_tests)
export async function PUT(req, { params }) {
  try {
    const api = decodeURIComponent(params.api);
    const body = await req.json();

    const {
      lease_well_name,
      company_name,
      company_email,
      company_phone,
      company_address,
      company_man_name,
      company_man_email,
      company_man_phone,

      county,
      wellhead_coords,

      previous_anchor_company,
      previous_anchor_work,
      directions_other_notes,

      need_by,
      managed_by_company,
      status,

      // NOTE: customer is NOT NULL in your schema — do not blank it out via PUT
      // customer,
    } = body || {};

    const { rows } = await q(
      `
      UPDATE wells
      SET
        lease_well_name         = $1,
        company_name            = $2,
        company_email           = $3,
        company_phone           = $4,
        company_address         = $5,
        company_man_name        = $6,
        company_man_email       = $7,
        company_man_phone       = $8,

        county                  = $9,
        wellhead_coords         = $10,

        previous_anchor_company = $11,
        previous_anchor_work    = $12,
        directions_other_notes  = $13,

        need_by                 = $14,
        managed_by_company      = $15,
        status                  = $16

      WHERE api = $17
      RETURNING
        id,
        api,
        lease_well_name,
        company_name,
        company_email,
        company_phone,
        company_address,
        company_man_name,
        company_man_email,
        company_man_phone,
        customer,
        customer_id,
        county,
        wellhead_coords,
        previous_anchor_company,
        previous_anchor_work,
        directions_other_notes,
        ${fmtDate("need_by")} AS need_by,
        managed_by_company,
        status,
        ${fmtDate("current_tested_at")}  AS current_tested_at,
        ${fmtDate("current_expires_at")} AS current_expires_at,
        current_test_id
      `,
      [
        lease_well_name ?? null,
        company_name ?? null,
        company_email ?? null,
        company_phone ?? null,
        company_address ?? null,
        company_man_name ?? null,
        company_man_email ?? null,
        company_man_phone ?? null,

        county ?? null,
        wellhead_coords ?? null,

        previous_anchor_company ?? null,
        previous_anchor_work ?? null,
        directions_other_notes ?? null,

        need_by ?? null,
        managed_by_company ?? null,
        status ?? null,

        api,
      ]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
