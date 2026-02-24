// app/api/wells/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

/**
 * GET /api/wells
 * - Admin/Employee: all wells
 * - Customer: only wells that match their customer_id (UUID)
 *
 * IMPORTANT:
 * We select from wells_view (not wells) so we’re insulated from legacy columns.
 * We also alias current_* fields to last_test_date / expiration_date for the UI.
 */
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
          api,
          lease_well_name,
          company_name,
          customer,
          customer_id,
          state,
          county,
          wellhead_coords,
          status,
          TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS last_test_date,
          TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS expiration_date,
          TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by
        FROM wells_view
        ORDER BY
          current_expires_at NULLS LAST,
          api ASC
        LIMIT 2000
      `);

      return NextResponse.json(rows);
    }

    // Customer: only their wells
    const { rows } = await q(
      `
      SELECT
        id,
        api,
        lease_well_name,
        company_name,
        customer,
        customer_id,
        state,
        county,
        wellhead_coords,
        status,
        TO_CHAR(current_tested_at, 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(current_expires_at, 'YYYY-MM-DD') AS expiration_date,
        TO_CHAR(need_by, 'YYYY-MM-DD') AS need_by
      FROM wells_view
      WHERE customer_id = $1
      ORDER BY
        current_expires_at NULLS LAST,
        api ASC
      LIMIT 2000
      `,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wells
 * Keep this simple and aligned with your new direction:
 * - No per-anchor coords
 * - Use wellhead_coords only
 * - Expiration should come from well_tests triggers (current_expires_at)
 */
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const isStaff = role === "admin" || role === "employee";

  try {
    const body = await req.json().catch(() => ({}));

    const {
      api,
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
      wellhead_coords,
      state,
      county,
      need_by,
      managed_by_company,
      status = "active",
      customer,
      customer_id, // for staff creating wells for a customer
    } = body || {};

    if (!api) {
      return NextResponse.json({ error: "api is required." }, { status: 400 });
    }

    // Who is allowed to set customer_id?
    // - staff can set it explicitly
    // - customers cannot impersonate; their wells should be tied to their own id
    const resolvedCustomerId = isStaff ? (customer_id ?? null) : session.user.id;

    const { rows } = await q(
      `
      INSERT INTO wells (
        api,
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
        wellhead_coords,
        state,
        county,
        need_by,
        managed_by_company,
        status,
        customer,
        customer_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING id, api
      `,
      [
        api,
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
        wellhead_coords ?? null,
        state ?? null,
        county ?? null,
        need_by ?? null,
        managed_by_company ?? null,
        status ?? "active",
        customer ?? null,
        resolvedCustomerId,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 400 }
    );
  }
}
