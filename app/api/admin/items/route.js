// app/api/admin/items/route.js
import { q } from "@/lib/db";

export async function GET() {
  const { rows } = await q(
    `SELECT * FROM invoice_items_catalog ORDER BY name ASC`
  );
  return Response.json(rows);
}
