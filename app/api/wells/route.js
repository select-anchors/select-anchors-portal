// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────────────────
 * Utilities
 * ──────────────────────────────────────────────────────────────────────────*/
function bool(x) {
  if (typeof x === "boolean") return x;
  if (typeof x === "string") return x.toLowerCase() === "true";
  return false;
}

function safeDateISO(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Fields we accept for create/update */
const FIELDS = [
  "company_name",
  "company_email",
  "company_phone",
  "company_address",
  "company_man_name",
  "company_man_email",
  "company_man_phone",
  "api",
  "anchor1_lat",
  "anchor1_lng",
  "anchor2_lat",
  "anchor2_lng",
  "anchor3_lat",
  "anchor3_lng",
  "anchor4_lat",
  "anchor4_lng",
  "previous_anchor_company",
  "previous_manager_notes",
  "last_test_date",          // YYYY-MM-DD
  "anchor1_expiration",      // YYYY-MM-DD
  "anchor2_expiration",      // YYYY-MM-DD
  "anchor3_expiration",      // YYYY-MM-DD
  "anchor4_expiration",      // YYYY-MM-DD
  "customer_id",             // optional linkage for customer visibility
];

const DATE_FIELDS = new Set([
  "last_test_date",
  "anchor1_expiration",
  "anchor2_expiration",
  "anchor3_expiration",
  "anchor4_expiration",
]);

function filterBody(body = {}) {
  const out = {};
  for (const k of FIELDS) {
    if (body[k] !== undefined) {
      out[k] = DATE_FIELDS.has(k) ? safeDateISO(body[k]) : body[k];
    }
  }
  return out;
}

function roleFromHeaders(headers) {
  const role = (headers.get("x-role") || "").toLowerCase().trim();
  // accepted: 'admin' | 'employee' | 'customer'
  if (role === "admin" || role === "customer" || role === "employee") return role;
  return "employee";
}

/** Build WHERE SQL & params for list queries */
function buildListWhere({ role, search, status, customerId, customerEmail }) {
  const where = [];
  const params = [];

  // status: 'approved' | 'pending' | 'all'
  if (status === "approved") {
    params.push(true);
    where.push(`is_approved = $${params.length}`);
  } else if (status === "pending") {
    params.push(false);
    where.push(`is_approved = $${params.length}`);
  }

  // Role-based visibility
  if (role === "customer") {
    if (customerId) {
      params.push(customerId);
      where.push(`customer_id = $${params.length}`);
    } else if (customerEmail) {
      params.push(customerEmail.toLowerCase());
      where.push(`LOWER(company_email) = $${params.length}`);
    } else {
      where.push("1 = 0"); // no identity → no results
    }
  }

  // Simple text search
  if (search) {
    const n = `%${search.toLowerCase()}%`;
    params.push(n, n, n);
    where.push(
      `(LOWER(company_name) LIKE $${params.length - 2} ` +
      `OR LOWER(api) LIKE $${params.length - 1} ` +
      `OR LOWER(company_man_name) LIKE $${params.length})`
    );
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { sqlWhere, params };
}

// Expression to compute earliest expiration across the 4 anchors
const NEXT_EXP_EXPR =
  `LEAST(
     COALESCE(anchor1_expiration, '9999-12-31'),
     COALESCE(anchor2_expiration, '9999-12-31'),
     COALESCE(anchor3_expiration, '9999-12-31'),
     COALESCE(anchor4_expiration, '9999-12-31')
   ) AS next_expiration`;

/* ────────────────────────────────────────────────────────────────────────────
 * GET /api/wells
 *   Query:
 *     ?api=30-015-54321           → single well by API (scoped for customers)
 *     ?q=needle                   → search
 *     ?status=approved|pending|all
 *   Headers:
 *     x-role: admin|employee|customer
 *     x-customer-id | x-customer-email (for customer role)
 * ──────────────────────────────────────────────────────────────────────────*/
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const api = searchParams.get("api");
    const qStr = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "all").toLowerCase();

    const headers = request.headers;
    const role = roleFromHeaders(headers);
    const customerId = headers.get("x-customer-id");
    const customerEmail = headers.get("x-customer-email");

    if (api) {
      // Single
      const clauses = [`api = $1`];
      const params = [api];

      if (role === "customer") {
        if (customerId) {
          params.push(customerId);
          clauses.push(`customer_id = $${params.length}`);
        } else if (customerEmail) {
          params.push(customerEmail.toLowerCase());
          clauses.push(`LOWER(company_email) = $${params.length}`);
        } else {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const { rows } = await q(
        `SELECT *, ${NEXT_EXP_EXPR}
         FROM wells
         WHERE ${clauses.join(" AND ")}
         LIMIT 1`,
        params
      );
      if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    // List
    const { sqlWhere, params } = buildListWhere({
      role,
      search: qStr || undefined,
      status,
      customerId,
      customerEmail,
    });

    const { rows } = await q(
      `SELECT *, ${NEXT_EXP_EXPR}
       FROM wells
       ${sqlWhere}
       ORDER BY created_at DESC NULLS LAST, id DESC`,
      params
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * POST /api/wells
 *   - Creates a well; only admins can force is_approved=true on create.
 *   - Body: allowed fields above, plus optional is_approved (admin only).
 * ──────────────────────────────────────────────────────────────────────────*/
export async function POST(request) {
  try {
    const headers = request.headers;
    const role = roleFromHeaders(headers);
    const body = await request.json();
    const data = filterBody(body);

    if (!data.company_name || !data.api) {
      return NextResponse.json(
        { error: "company_name and api are required" },
        { status: 400 }
      );
    }

    let isApproved = false;
    if (role === "admin" && body.is_approved !== undefined) {
      isApproved = bool(body.is_approved);
    }

    const cols = [];
    const vals = [];
    const params = [];
    for (const [k, v] of Object.entries(data)) {
      cols.push(k);
      params.push(v === "" ? null : v);
      vals.push(`$${params.length}`);
    }
    cols.push("is_approved");
    params.push(isApproved);
    vals.push(`$${params.length}`);

    const { rows } = await q(
      `INSERT INTO wells (${cols.join(", ")})
       VALUES (${vals.join(", ")})
       RETURNING *`,
      params
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PATCH /api/wells
 *   Approve: { id, approve: true }          → admin only
 *   Edit:    { id, ...fields }              → flips is_approved=false for re-approval
 * ──────────────────────────────────────────────────────────────────────────*/
export async function PATCH(request) {
  try {
    const headers = request.headers;
    const role = roleFromHeaders(headers);
    const body = await request.json();

    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Approve
    if (bool(body.approve)) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { rows } = await q(
        `UPDATE wells
         SET is_approved = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    // Edit → flips approval off
    const updates = filterBody(body);
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(updates)) {
      params.push(v === "" ? null : v);
      sets.push(`${k} = $${params.length}`);
    }
    sets.push(`is_approved = FALSE`);
    sets.push(`updated_at = NOW()`);

    params.push(id);
    const { rows } = await q(
      `UPDATE wells
       SET ${sets.join(", ")}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
