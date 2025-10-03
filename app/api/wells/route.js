// app/api/wells/route.js
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

function addYears(dateStr, years = 2) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// GET /api/wells?search=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("search") || "").trim();
  let rows;
  if (q) {
    rows = (await sql`
      select * from wells
      where api ilike ${'%' + q + '%'}
         or customer_name ilike ${'%' + q + '%'}
         or county ilike ${'%' + q + '%'}
      order by need_by_date nulls last, created_at desc
    `).rows;
  } else {
    rows = (await sql`
      select * from wells
      order by need_by_date nulls last, created_at desc
    `).rows;
  }
  return NextResponse.json(rows);
}

// POST /api/wells
export async function POST(req) {
  try {
    const body = await req.json();
    const required = ["api", "customer_name"];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === "") {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
    }

    const {
      api,
      customer_name,
      customer_email = null,
      customer_phone = null,
      lease_name = null,
      state = null,
      county = null,
      need_by_date = null,
      wsn_route_url = null,
      apple_maps_url = null,
      google_maps_url = null,
      anchors = []
    } = body;

    await sql.begin(async (tx) => {
      await tx`
        insert into wells (api, customer_name, customer_email, customer_phone, lease_name, state, county, need_by_date, wsn_route_url, apple_maps_url, google_maps_url)
        values (${api}, ${customer_name}, ${customer_email}, ${customer_phone}, ${lease_name}, ${state}, ${county}, ${need_by_date}, ${wsn_route_url}, ${apple_maps_url}, ${google_maps_url})
        on conflict (api) do nothing
      `;

      for (const a of anchors) {
        const anchor_no = Number(a.anchor_no);
        if (![1,2,3,4].includes(anchor_no)) continue;
        const next_due_date = addYears(a.last_tested_date, 2);
        await tx`
          insert into anchors (well_api, anchor_no, lat, lng, last_tested_date, next_due_date, status)
          values (${api}, ${anchor_no}, ${a.lat || null}, ${a.lng || null}, ${a.last_tested_date || null}, ${next_due_date}, ${a.status || null})
          on conflict do nothing
        `;
      }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/wells/${api}`);
    revalidatePath("/wells");

    return NextResponse.json({ ok: true, api }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
