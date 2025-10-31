// app/api/admin/items/route.js
import { q } from "@/lib/db";

// List
export async function GET() {
  const { rows } = await q(
    `SELECT * FROM invoice_items_catalog ORDER BY name ASC`
  );
  return Response.json(rows);
}

// Create
export async function POST(req) {
  const body = await req.json();
  const { code, name, unit = "each", default_rate = null, qb_item_name = null, notes = null } = body;

  if (!code?.trim() || !name?.trim()) {
    return new Response("code and name are required", { status: 400 });
  }

  try {
    const { rows } = await q(
      `INSERT INTO invoice_items_catalog
         (code, name, unit, default_rate, qb_item_name, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING *`,
      [code.trim(), name.trim(), unit.trim(), default_rate, qb_item_name, notes]
    );
    return Response.json(rows[0], { status: 201 });
  } catch (e) {
    // Unique code constraint friendly message
    if (String(e.message).includes("unique") || String(e.message).includes("duplicate key")) {
      return new Response("An item with that code already exists.", { status: 409 });
    }
    return new Response(e.message ?? "DB error", { status: 500 });
  }
}
