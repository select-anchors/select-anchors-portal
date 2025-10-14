// app/api/wells/route.js
import db from '../../../lib/db';

export async function GET() {
  const { rows } = await query(
    "CREATE TABLE IF NOT EXISTS wells (id serial PRIMARY KEY, api text UNIQUE, customer text, county text, need_by text, expiration text); SELECT * FROM wells;"
  );
  return new Response(JSON.stringify(rows || []), { status: 200 });
}

// (Optional) POST to add a well
export async function POST(req) {
  const body = await req.json();
  const { api, customer, county, need_by, expiration } = body;

  const { rows } = await query(
    `INSERT INTO wells (api, customer, county, need_by, expiration)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (api) DO UPDATE SET customer=EXCLUDED.customer, county=EXCLUDED.county, need_by=EXCLUDED.need_by, expiration=EXCLUDED.expiration
     RETURNING *`,
    [api, customer, county, need_by, expiration]
  );

  return new Response(JSON.stringify(rows[0]), { status: 201 });
}
