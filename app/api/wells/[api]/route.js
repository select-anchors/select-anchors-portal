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
