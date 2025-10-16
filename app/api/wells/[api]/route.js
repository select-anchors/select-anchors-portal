import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(_req, { params }) {
  const api = params.api;

  const { rows: wells } = await q(`
    select 
      w.id, w.api, w.company_man_name, w.company_man_number, 
      w.company_man_email, w.company_man_cell,
      w.previous_anchor_company, w.last_test_date,
      c.name as company_name, c.email as company_email, c.phone as company_phone, c.address as company_address
    from wells w
    left join companies c on c.id = w.company_id
    where w.api = $1
    limit 1
  `, [api]);

  if (wells.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const well = wells[0];
  const { rows: anchors } = await q(`
    select quadrant, lat, lng
    from anchors
    where well_id = $1
    order by quadrant asc
  `, [well.id]);

  return NextResponse.json({ well, anchors });
}
