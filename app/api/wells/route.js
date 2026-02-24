// app/api/wells/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

// GET /api/wells  -> list wells
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id; // UUID string

  try {
    // Admin/employee: all wells
    if (role === "admin" || role === "employee") {
      const { rows } = await q(`
        SELECT
          id,
          lease_well_name,
          api,
          wellhead_coords,
          company_name,
          company_man_name,

          -- Use "current" test summary first (from well_tests trigger),
          -- fall back to legacy columns if they still exist/populated.
          TO_CHAR(COALESCE(current_tested_at, last_test_date), 'YYYY-MM-DD') AS last_test_date,
          TO_CHAR(COALESCE(current_expires_at, expiration_date), 'YYYY-MM-DD') AS expiration_date,

          status
        FROM wells
        ORDER BY id DESC, lease_well_name ASC
        LIMIT 500
      `);

      return NextResponse.json(rows);
    }

    // Customer: only their wells
    const { rows } = await q(
      `
      SELECT
        id,
        lease_well_name,
        api,
        wellhead_coords,
        company_name,
        company_man_name,
        TO_CHAR(COALESCE(current_tested_at, last_test_date), 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(COALESCE(current_expires_at, expiration_date), 'YYYY-MM-DD') AS expiration_date,
        status
      FROM wells
      WHERE customer_id = $1
      ORDER BY id DESC, lease_well_name ASC
      LIMIT 500
      `,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/wells -> create (left mostly as-is, but you should remove any columns you dropped)
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
      managed_by_company,
      status = "pending",
      customer,
      customer_id,
    } = body;

    const { rows } = await q(
      `
      INSERT INTO wells (
        lease_well_name, api, wellhead_coords,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        need_by, managed_by_company, status,
        customer, customer_id
      ) VALUES (
        $1,$2,$3,
        $4,$5,$6,$7,
        $8,$9,$10,
        $11,$12,$13,
        $14,$15,$16,
        $17,$18
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
        managed_by_company ?? null,
        status ?? "pending",
        customer ?? null,
        customer_id ?? null,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json(
      { error: String(err.message || err) },
      { status: 400 }
    );
  }
}
