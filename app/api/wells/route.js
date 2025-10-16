// /app/api/wells/route.js
// Notes:
// - Minimal, secure-by-default filtering: customers only see their own wells.
// - Admin/Employee can see all wells.
// - Auth is TEMP: role/customerId are read from headers or cookies so we can ship now.
// - When you wire real auth, replace `getRequestIdentity` with your session lookup.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** TEMP identity reader — replace later with real auth/session */
function getRequestIdentity(req) {
  // Allow either headers (easy for front-end fetch) or cookies (easy for UI)
  const roleHeader = req.headers.get("x-role");
  const custHeader = req.headers.get("x-customer-id");

  const c = cookies();
  const roleCookie = c.get("role")?.value;
  const custCookie = c.get("customerId")?.value;

  const role = (roleHeader || roleCookie || "").toLowerCase(); // "admin" | "employee" | "customer"
  const customerId = custHeader || custCookie || "";

  // 🚧 Default behavior: if nothing provided, treat as ADMIN so UI doesn't break.
  // Swap this to "customer" or 401 once real auth is wired.
  return {
    role: role || "admin",
    customerId,
  };
}

/** GET /api/wells
 * Admin/Employee -> returns all wells
 * Customer       -> returns only wells where wells.customer_id = customerId
 */
export async function GET(req) {
  try {
    const { role, customerId } = getRequestIdentity(req);

    let rows;
    if (role === "admin" || role === "employee") {
      // full access
      const { rows: r } = await sql`SELECT * FROM wells ORDER BY created_at DESC NULLS LAST`;
      rows = r;
    } else if (role === "customer") {
      if (!customerId) {
        return NextResponse.json(
          { error: "Missing customer id" },
          { status: 400 }
        );
      }
      const { rows: r } =
        await sql`SELECT * FROM wells WHERE customer_id = ${customerId} ORDER BY created_at DESC NULLS LAST`;
      rows = r;
    } else {
      // Unknown role — lock down
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/wells
 * Create/submit a well. We mark it as `is_approved = false` so an admin can approve later.
 * Body shape is flexible; only the listed fields are used.
 */
export async function POST(req) {
  try {
    const { role, customerId } = getRequestIdentity(req);
    if (!(role === "admin" || role === "employee")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Basic fields we expect. If some are not present, they’ll go in as null.
    const {
      // well ownership / linkage
      customer_id = body.customer_id || customerId || null,

      // company + company man
      company_name,
      company_email,
      company_phone,
      company_address,
      company_man_name,
      company_man_email,
      company_man_phone,

      // identifiers
      api,
      previous_anchor_company,
      last_test_date, // 'YYYY-MM-DD'

      // gps (anchors 1-4)
      anchor1_lat, anchor1_lng,
      anchor2_lat, anchor2_lng,
      anchor3_lat, anchor3_lng,
      anchor4_lat, anchor4_lng,
    } = body || {};

    // Insert with is_approved = false (admin must approve later)
    const insert = await sql`
      INSERT INTO wells (
        customer_id,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        api, previous_anchor_company, last_test_date,
        anchor1_lat, anchor1_lng,
        anchor2_lat, anchor2_lng,
        anchor3_lat, anchor3_lng,
        anchor4_lat, anchor4_lng,
        is_approved
      )
      VALUES (
        ${customer_id},
        ${company_name}, ${company_email}, ${company_phone}, ${company_address},
        ${company_man_name}, ${company_man_email}, ${company_man_phone},
        ${api}, ${previous_anchor_company}, ${last_test_date},
        ${anchor1_lat}, ${anchor1_lng},
        ${anchor2_lat}, ${anchor2_lng},
        ${anchor3_lat}, ${anchor3_lng},
        ${anchor4_lat}, ${anchor4_lng},
        ${false}
      )
      RETURNING *;
    `;

    return NextResponse.json(insert.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/wells
 * Admin-only approval or update.
 * Body:
 *   { id, approve: true }                 -> sets is_approved = true
 *   { id, ...editableFields }             -> updates fields & sets is_approved = false (re-approval needed)
 */
export async function PATCH(req) {
  try {
    const { role } = getRequestIdentity(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, approve, ...changes } = body || {};
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (approve === true) {
      const { rows } =
        await sql`UPDATE wells SET is_approved = true, approved_at = NOW() WHERE id = ${id} RETURNING *`;
      return NextResponse.json(rows[0] || null, { status: 200 });
    }

    // Build a dynamic UPDATE for provided fields, mark for re-approval
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [k, v] of Object.entries(changes)) {
      // Only allow known columns to be updated (simple allowlist)
      if (
        [
          "customer_id",
          "company_name", "company_email", "company_phone", "company_address",
          "company_man_name", "company_man_email", "company_man_phone",
          "api", "previous_anchor_company", "last_test_date",
          "anchor1_lat", "anchor1_lng",
          "anchor2_lat", "anchor2_lng",
          "anchor3_lat", "anchor3_lng",
          "anchor4_lat", "anchor4_lng",
        ].includes(k)
      ) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
    }

    // If nothing to update, just return current row
    if (fields.length === 0) {
      const { rows } = await sql`SELECT * FROM wells WHERE id = ${id}`;
      return NextResponse.json(rows[0] || null, { status: 200 });
    }

    // Add is_approved reset
    fields.push(`is_approved = false`);
    const query = `
      UPDATE wells
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const { rows } = await sql.query(query, [...values, id]);
    return NextResponse.json(rows[0] || null, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
