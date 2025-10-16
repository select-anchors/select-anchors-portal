import { NextResponse } from "next/server";
import { q } from "@/lib/db";

/**
 * GET /api/wells
 * Query params:
 *  - search: string (matches customer/company name, API, county)
 *  - sort: "need" | "expiration"  (defaults to "need")
 *  - limit: number (default 50)
 *  - offset: number (default 0)
 *
 * Returns rows shaped for the dashboard table.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const search = (searchParams.get("search") || "").trim();
  const sort = (searchParams.get("sort") || "need").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  // Sort mapping: need-by soonest first, then expiration soonest
  const orderBy =
    sort === "expiration"
      ? `w.last_test_date nulls last, w.expiration_date nulls last`
      : `w.need_by nulls last, w.expiration_date nulls last`;

  // Basic search across common columns
  const where = [];
  const args = [];
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    where.push(`
      (
        lower(w.api) like $${args.length}
        or lower(c.name) like $${args.length}
        or lower(w.county) like $${args.length}
      )
    `);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const sql = `
    select
      w.id,
      w.api,
      coalesce(c.name, '—') as customer,
      coalesce(w.county, '—') as county,
      -- normalize "need-by" and "expiration" display values
      to_char(w.need_by, 'YYYY-MM-DD') as need,
      to_char(w.expiration_date, 'YYYY-MM-DD') as exp,
      w.status
    from wells w
    left join companies c on c.id = w.company_id
    ${whereSql}
    order by ${orderBy}
    limit $${args.length + 1}
    offset $${args.length + 2}
  `;

  const { rows } = await q(sql, [...args, limit, offset]);
  return NextResponse.json(rows);
}

/**
 * POST /api/wells
 * Body: {
 *   well: {
 *     api: string,
 *     company: { name, email?, phone?, address? },
 *     companyMan?: { name?, number?, email?, cell? },
 *     previousAnchorCompany?: string,
 *     lastTestDate?: string (YYYY-MM-DD),
 *     needBy?: string (YYYY-MM-DD),
 *     expirationDate?: string (YYYY-MM-DD),
 *     county?: string,
 *     anchors?: [
 *       { quadrant: 1|2|3|4, lat: number, lng: number },
 *       ...
 *     ]
 *   },
 *   submittedBy?: { userId?, name?, role? }   // optional audit info
 * }
 *
 * Behavior:
 *   - Creates a record in pending_changes with kind="create_well" for **admin approval**.
 *   - Admin can approve via /api/admin/changes/[id]/approve we set up earlier.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const well = body?.well;
  if (!well?.api || !well?.company?.name) {
    return NextResponse.json(
      { error: "Missing required fields: well.api and well.company.name" },
      { status: 400 }
    );
  }

  // Normalize anchors (optional)
  const anchors = Array.isArray(well.anchors)
    ? well.anchors
        .filter(a => a && a.quadrant != null)
        .map(a => ({
          quadrant: Number(a.quadrant),
          lat: a.lat != null ? Number(a.lat) : null,
          lng: a.lng != null ? Number(a.lng) : null,
        }))
    : [];

  const payload = {
    kind: "create_well",
    well: {
      api: String(well.api).trim(),
      company: {
        name: String(well.company.name).trim(),
        email: well.company.email || null,
        phone: well.company.phone || null,
        address: well.company.address || null,
      },
      companyMan: {
        name: well.companyMan?.name || null,
        number: well.companyMan?.number || null,
        email: well.companyMan?.email || null,
        cell: well.companyMan?.cell || null,
      },
      previousAnchorCompany: well.previousAnchorCompany || null,
      lastTestDate: well.lastTestDate || null,
      needBy: well.needBy || null,
      expirationDate: well.expirationDate || null,
      county: well.county || null,
      anchors,
    },
    submittedBy: body.submittedBy || null,
  };

  // Create a pending change to await admin approval
  const { rows } = await q(
    `
    insert into pending_changes (kind, payload, status)
    values ($1, $2, 'pending')
    returning id, created_at
  `,
    [payload.kind, payload]
  );

  return NextResponse.json(
    {
      ok: true,
      changeId: rows[0].id,
      createdAt: rows[0].created_at,
      note: "Submitted for admin approval.",
    },
    { status: 201 }
  );
}
