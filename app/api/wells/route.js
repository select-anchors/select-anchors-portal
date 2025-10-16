// /app/api/wells/route.js
// Role-based wells API using your pg pool helper `q()`.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/** TEMP identity reader — replace with real auth later */
function getRequestIdentity(req) {
  const roleHeader = req.headers.get("x-role");
  const custHeader = req.headers.get("x-customer-id");

  const c = cookies();
  const roleCookie = c.get("role")?.value;
  const custCookie = c.get("customerId")?.value;

  const role = (roleHeader || roleCookie || "").toLowerCase(); // "admin" | "employee" | "customer"
  const customerId = custHeader || custCookie || "";

  // Default to admin so UI doesn’t 401 while we wire real auth
  return { role: role || "admin", customerId };
}

/** GET /api/wells
 * Admin/Employee -> all wells
 * Customer       -> only their wells
 */
export async function GET(req) {
  try {
    const { role, customerId } = getRequestIdentity(req);

    let rows;
    if (role === "admin" || role === "employee") {
      const r = await q(`SELECT * FROM wells ORDER BY created_at DESC NULLS LAST`);
      rows = r.rows;
    } else if (role === "customer") {
      if (!customerId) {
        return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
      }
      const r = await q(
        `SELECT * FROM wells WHERE customer_id = $1 ORDER BY created_at DESC NULLS LAST`,
        [customerId]
      );
      rows = r.rows;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/wells
 * Admin/Employee can create. New wells default to is_approved=false (need admin approval).
 */
export async function POST(req) {
  try {
    const { role, customerId: requesterCustomerId } = getRequestIdentity(req);
    if (!(role === "admin" || role === "employee")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Map incoming fields (nulls are fine)
    const {
      customer_id = body.customer_id || requesterCustomerId || null,

      company_name,
      company_email,
      company_phone,
      company_address,

      company_man_name,
      company_man_email,
      company_man_phone,

      api,
      previous_anchor_company,
      last_test_date, // 'YYYY-MM-DD'

      anchor1_lat, anchor1_lng,
      anchor2_lat, anchor2_lng,
      anchor3_lat, anchor3_lng,
      anchor4_lat, anchor4_lng,
    } = body || {};

    const insert = await q(
      `
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
        $1,
        $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15,
        $16, $17,
        $18, $19,
        false
      )
      RETURNING *;
      `,
      [
        customer_id,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        api, previous_anchor_company, last_test_date,
        anchor1_lat, anchor1_lng,
        anchor2_lat, anchor2_lng,
        anchor3_lat, anchor3_lng,
        anchor4_lat, anchor4_lng,
      ]
    );

    return NextResponse.json(insert.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/wells
 * Admin-only approval or edits.
 * Body:
 *   { id, approve: true } -> sets is_approved = true, approved_at = now()
 *   { id, ...fields }     -> updates provided fields, sets is_approved = false
 */
export async function PATCH(req) {
  try {
    const { role } = getRequestIdentity(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, approve, ...changes } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (approve === true) {
      const r = await q(
        `UPDATE wells SET is_approved = true, approved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json(r.rows[0] || null, { status: 200 });
    }

    const allowed = new Set([
      "customer_id",
      "company_name", "company_email", "company_phone", "company_address",
      "company_man_name", "company_man_email", "company_man_phone",
      "api", "previous_anchor_company", "last_test_date",
      "anchor1_lat", "anchor1_lng",
      "anchor2_lat", "anchor2_lng",
      "anchor3_lat", "anchor3_lng",
      "anchor4_lat", "anchor4_lng",
    ]);

    const keys = Object.keys(changes).filter((k) => allowed.has(k));
    if (keys.length === 0) {
      const r = await q(`SELECT * FROM wells WHERE id = $1`, [id]);
      return NextResponse.json(r.rows[0] || null, { status: 200 });
    }

    const setSql = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const vals = keys.map((k) => changes[k]);

    const r = await q(
      `
      UPDATE wells
      SET ${setSql}, is_approved = false
      WHERE id = $${keys.length + 1}
      RETURNING *;
      `,
      [...vals, id]
    );

    return NextResponse.json(r.rows[0] || null, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
