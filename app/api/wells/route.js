// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

/**
 * GET: list approved wells (simple list for tables)
 */
export async function GET() {
  const { rows } = await q(`
    select
      w.id, w.api, c.name as company,
      w.company_man_name, w.company_man_email, w.company_man_cell,
      w.previous_anchor_company, w.last_test_date
    from wells w
    left join companies c on c.id = w.company_id
    order by w.created_at desc
  `);
  return NextResponse.json(rows);
}

/**
 * POST: submit creation/update -> goes to pending_changes (admin approval)
 * Body for create_well example:
 * {
 *   "kind": "create_well",
 *   "submittedBy": "employee@selectanchors.com",
 *   "well": {
 *     "api": "30-015-54321",
 *     "company": { "name": "...", "email":"...", "phone":"...", "address":"..." },
 *     "companyMan": { "name":"...", "number":"...", "email":"...", "cell":"..." },
 *     "previousAnchorCompany":"...",
 *     "lastTestDate":"2025-10-01",
 *     "anchors": [
 *       {"quadrant":"NE","lat":32.1,"lng":-104.2},
 *       {"quadrant":"NW","lat":32.1,"lng":-104.21},
 *       {"quadrant":"SE","lat":32.09,"lng":-104.2},
 *       {"quadrant":"SW","lat":32.09,"lng":-104.21}
 *     ]
 *   }
 * }
 */
export async function POST(req) {
  const body = await req.json();
  if (!body?.kind || !["create_well","update_well"].includes(body.kind)) {
    return NextResponse.json({error: "Invalid kind"}, { status: 400 });
  }
  await q(
    `insert into pending_changes (kind, submitted_by, payload)
     values ($1,$2,$3)`,
    [body.kind, body.submittedBy || null, body]
  );
  return NextResponse.json({ ok: true, status: "queued_for_approval" });
}
