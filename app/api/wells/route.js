// app/api/wells/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/wells → list wells
export async function GET() {
  const { rows } = await query(
    `SELECT id, customer, api,
            county, need_by as "needBy",
            expiration, status
     FROM wells
     ORDER BY need_by NULLS LAST, expiration NULLS LAST`
  );
  return NextResponse.json(rows);
}

// POST /api/wells → create a well { customer, api, county, needBy, expiration, status? }
export async function POST(req) {
  const { customer, api, county, needBy, expiration, status } = await req.json();

  const { rows } = await query(
    `INSERT INTO wells (customer, api, county, need_by, expiration, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, customer, api, county, need_by as "needBy", expiration, status`,
    [customer, api, county, needBy, expiration, status ?? "Queued"]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
