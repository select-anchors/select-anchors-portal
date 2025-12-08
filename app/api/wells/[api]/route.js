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
        lease_well_name, api,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        TO_CHAR(last_test_date, 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
        TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by,
        managed_by_company, status,
        customer, customer_id
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/wells/[api] -> update well fields
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
      previous_anchor_work,
      directions_other_notes,
      last_test_date,
      expiration_date,
      need_by,
      managed_by_company,
      status,
    } = body;

    const { rows } = await q(
      `
      UPDATE wells
      SET
        lease_well_name       = $1,
        company_name          = $2,
        company_email         = $3,
        company_phone         = $4,
        company_address       = $5,
        company_man_name      = $6,
        company_man_email     = $7,
        company_man_phone     = $8,
        previous_anchor_work  = $9,
        directions_other_notes = $10,
        last_test_date        = $11,
        expiration_date       = $12,
        need_by               = $13,
        managed_by_company    = $14,
        status                = $15
      WHERE api = $16
      RETURNING
        id,
        lease_well_name,
        api,
        company_name,
        company_email,
        company_phone,
        company_address,
        company_man_name,
        company_man_email,
        company_man_phone,
        previous_anchor_work,
        directions_other_notes,
        TO_CHAR(last_test_date, 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
        TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by,
        managed_by_company,
        status;
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
        previous_anchor_work ?? null,
        directions_other_notes ?? null,
        last_test_date ?? null,
        expiration_date ?? null,
        need_by ?? null,
        managed_by_company ?? null,
        status ?? null,
        api,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
