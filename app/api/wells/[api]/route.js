// app/api/wells/[api]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    const api = decodeURIComponent(params.api);

    const { rows } = await q(
      `
      SELECT
        id,
        api,
        lease_well_name,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        previous_anchor_company,
        previous_anchor_work,
        directions_other_notes,
        wellhead_coords,
        state,
        county,
        TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by,
        managed_by_company,
        status,
        customer,
        customer_id,

        -- "Current" test summary (driven by well_tests / triggers)
        TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS current_expires_at
      FROM wells
      WHERE api = $1
      LIMIT 1
      `,
      [api]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("GET /api/wells/[api] error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

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
      previous_anchor_company,
      previous_anchor_work,
      directions_other_notes,
      need_by,
      managed_by_company,
      status,
      state,
      county,
      wellhead_coords,
      customer,
      customer_id,
    } = body;

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
        previous_anchor_company = $9,
        previous_anchor_work    = $10,
        directions_other_notes  = $11,
        need_by                 = $12,
        managed_by_company      = $13,
        status                  = $14,
        state                   = $15,
        county                  = $16,
        wellhead_coords         = $17,
        customer                = $18,
        customer_id             = $19,
        updated_at              = NOW()
      WHERE api = $20
      RETURNING
        id,
        api,
        lease_well_name,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        previous_anchor_company,
        previous_anchor_work,
        directions_other_notes,
        wellhead_coords,
        state,
        county,
        TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by,
        managed_by_company,
        status,
        customer,
        customer_id,
        TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS current_expires_at
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
        previous_anchor_company ?? null,
        previous_anchor_work ?? null,
        directions_other_notes ?? null,
        need_by ?? null,
        managed_by_company ?? null,
        status ?? null,
        state ?? null,
        county ?? null,
        wellhead_coords ?? null,
        customer ?? null,
        customer_id ?? null,
        api,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
