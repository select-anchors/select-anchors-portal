// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

/** ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────────*/
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

// Whitelist fields we accept for create/update
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
  "last_test_date",     // expects YYYY-MM-DD
  "customer_id",        // optional linkage for customer views
];

function filterBody(body = {}) {
  const out = {};
  for (const k of FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  if ("last_test_date" in out) {
    out.last_test_date = safeDateISO(out.last_test_date);
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
    // Prefer customerId, else fallback to company_email match
    if (customerId) {
      params.push(customerId);
      where.push(`customer_id = $${params.length}`);
    } else if (customerEmail) {
      params.push(customerEmail.toLowerCase());
      where.push(`LOWER(company_email) = $${params.length}`);
    } else {
      // If we don't know which customer, no results.
      where.push("1 = 0");
    }
  }

  // Simple text search across a few columns
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

/** ─────────────────────────────────────────────────────────────────────────────
 * GET /api/wells
 *   - List wells (admin/employee = all; customer = only their wells)
 *   - Query params:
 *       ?api=30-015-54321             → get single by API
 *       ?q=needle                     → search company/api/company_man_name
 *       ?status=approved|pending|all  → filter by approval state
 *   - Headers:
 *       x-role: admin|employee|customer
 *       x-customer-id: <id>      (for customer role)
 *       x-customer-email: <email> (fallback for customer role)
 * ────────────────────────────────────────────────────────────────────────────*/
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

    // Single by API:
    if (api) {
      // Respect customer visibility on single fetch too
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
        `SELECT * FROM wells WHERE ${clauses.join(" AND ")} LIMIT 1`,
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
      `SELECT * FROM wells ${sqlWhere} ORDER BY created_at DESC NULLS LAST, id DESC`
      , params
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** ─────────────────────────────────────────────────────────────────────────────
 * POST /api/wells
 *   - Create a new well (defaults to is_approved = false unless admin overrides)
 *   - Body: any of the whitelisted fields + optional is_approved (admin only)
 *   - Headers:
 *       x-role: admin|employee|customer
 *     (employees/customers cannot force approval)
 * ────────────────────────────────────────────────────────────────────────────*/
export async function POST(request) {
  try {
    const headers = request.headers;
    const role = roleFromHeaders(headers);
    const body = await request.json();
    const data = filterBody(body);

    // Required minimal fields
    if (!data.company_name || !data.api) {
      return NextResponse.json(
        { error: "company_name and api are required" },
        { status: 400 }
      );
    }

    // Approval rules
    let isApproved = false;
    if (role === "admin" && body.is_approved !== undefined) {
      isApproved = bool(body.is_approved);
    }

    // Build INSERT
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
       RETURNING *`
      , params
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** ─────────────────────────────────────────────────────────────────────────────
 * PATCH /api/wells
 *   - Approve:  { id, approve: true }
 *   - Edit:     { id, ...fields }  → sets is_approved = false (requires re-approval)
 *   - Headers:
 *       x-role: admin|employee|customer
 *     (Only admin can approve. Employees can edit but that triggers re-approval.)
 * ────────────────────────────────────────────────────────────────────────────*/
export async function PATCH(request) {
  try {
    const headers = request.headers;
    const role = roleFromHeaders(headers);
    const body = await request.json();

    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Approve path
    if (bool(body.approve)) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { rows } = await q(
        `UPDATE wells SET is_approved = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    // Edit path → always flips approval off (requires re-approval)
    const updates = filterBody(body);
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(updates)) {
      params.push(v === "" ? null : v);
      sets.push(`${k} = $${params.length}`);
    }
    // Flip approval off on any edit
    sets.push(`is_approved = FALSE`);
    sets.push(`updated_at = NOW()`);

    params.push(id);
    const { rows } = await q(
      `UPDATE wells SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
