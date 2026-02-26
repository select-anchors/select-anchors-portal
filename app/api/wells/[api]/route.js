// app/api/wells/[api]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

function emptyToNullDate(v) {
  if (v === "" || v === undefined) return null;
  return v; // allow null or "YYYY-MM-DD"
}
function emptyToNullText(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

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
        managed_by_company,
        status,
        customer,
        customer_id,

        -- "Current" test summary (driven by well_tests / triggers)
        TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS current_expires_at,
        current_test_id
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
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
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
      managed_by_company,
      status,
      state,
      county,
      wellhead_coords,
      customer,
      customer_id,

      // Editable from admin page, affects well_tests:
      current_tested_at,
      current_expires_at,
    } = body;

    // 1) Update base well record (non-test fields)
    const updatedWell = await q(
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
        managed_by_company      = $12,
        status                  = $13,
        state                   = $14,
        county                  = $15,
        wellhead_coords         = $16,
        customer                = COALESCE($17, customer),
        customer_id             = $18,
        updated_at              = NOW()
      WHERE api = $19
      RETURNING id, api, current_test_id
      `,
      [
        emptyToNullText(lease_well_name),
        emptyToNullText(company_name),
        emptyToNullText(company_email),
        emptyToNullText(company_phone),
        emptyToNullText(company_address),
        emptyToNullText(company_man_name),
        emptyToNullText(company_man_email),
        emptyToNullText(company_man_phone),
        emptyToNullText(previous_anchor_company),
        emptyToNullText(previous_anchor_work),
        emptyToNullText(directions_other_notes),
        emptyToNullText(managed_by_company),
        emptyToNullText(status),
        emptyToNullText(state),
        emptyToNullText(county),
        emptyToNullText(wellhead_coords),
        emptyToNullText(customer),
        customer_id ?? null,
        api,
      ]
    );

    if (updatedWell.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentTestId = updatedWell.rows[0].current_test_id;

    // 2) If admin provided test dates, update/create a well_tests row
    const testedAt = emptyToNullDate(current_tested_at);
    const expiresAt = emptyToNullDate(current_expires_at);

    const shouldWriteTest =
      current_tested_at !== undefined || current_expires_at !== undefined;

    if (shouldWriteTest) {
      // If both are null/blank, do nothing (avoid creating empty tests)
      const hasAnyValue = Boolean(testedAt || expiresAt);

      if (hasAnyValue) {
        if (currentTestId) {
          // Update the "current" test row (NO updated_at column assumed)
          await q(
            `
            UPDATE well_tests
            SET
              tested_at  = COALESCE($1, tested_at),
              expires_at = $2
            WHERE id = $3
            `,
            [testedAt, expiresAt, currentTestId]
          );
        } else {
          // Create a new test row; your trigger should set wells.current_* accordingly
          await q(
            `
            INSERT INTO well_tests (
              well_api,
              tested_at,
              expires_at,
              tested_by_company
            ) VALUES ($1, $2, $3, $4)
            `,
            [api, testedAt, expiresAt, "Manual edit (admin)"]
          );
        }
      }
    }

    // 3) Return full refreshed record
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
        managed_by_company,
        status,
        customer,
        customer_id,
        TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS current_tested_at,
        TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS current_expires_at,
        current_test_id
      FROM wells
      WHERE api = $1
      LIMIT 1
      `,
      [api]
    );

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
