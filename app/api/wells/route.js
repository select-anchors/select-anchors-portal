// app/api/wells/route.js
import { q } from "@/lib/db";

// TODO: replace with your real auth
async function getUser() {
  // Example shape; replace with your auth provider values
  return {
    id: "demo-user-id",
    role: "admin", // or "employee" or "customer"
    customer_id: null, // for customers we scope by this
  };
}

export async function GET(req) {
  try {
    const user = await getUser();

    // Scope rows:
    // - admin/employee: see everything
    // - customer: only their wells
    let sql = "SELECT * FROM wells";
    const params = [];

    if (user.role === "customer" && user.customer_id) {
      sql += " WHERE customer_id = $1";
      params.push(user.customer_id);
    }

    sql += " ORDER BY need_by NULLS LAST, expiration_date NULLS LAST, created_at DESC";

    const { rows } = await q(sql, params);
    return new Response(JSON.stringify(rows), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("GET /api/wells error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUser();
    // Employees/Admins can create. Customers could create 'pending' if you want.
    if (!["admin", "employee"].includes(user.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await req.json();

    const {
      company_name,
      company_email,
      company_phone,
      company_address,

      company_man_name,
      company_man_email,
      company_man_phone,

      lease_well_name,
      api,

      anchor1_coords,
      anchor2_coords,
      anchor3_coords,
      anchor4_coords,

      previous_anchor_work,
      directions_other_notes,
      previous_anchor_company,
      last_test_date,
      expiration_date,
      need_by,

      customer_id,        // optional, if tying to a customer
      managed_by_company, // optional
      status,             // optional: default 'approved' unless you want approval flow here
    } = body;

    const { rows } = await q(
      `
      INSERT INTO wells (
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        lease_well_name, api,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        last_test_date, expiration_date, need_by,
        customer_id, managed_by_company, status
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,
        $10,$11,$12,$13,
        $14,$15,$16,
        $17,$18,$19,
        $20,$21, COALESCE($22, 'approved')
      )
      RETURNING *;
      `,
      [
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        lease_well_name, api,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        last_test_date || null, expiration_date || null, need_by || null,
        customer_id || null, managed_by_company || null, status || null,
      ]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("POST /api/wells error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
