// app/api/admin/items/[id]/route.js
import { q } from "@/lib/db";

export async function PUT(req, { params }) {
  const id = params.id;
  const body = await req.json();

  const { name, unit, default_rate } = body;
  const { rows } = await q(
    `UPDATE invoice_items_catalog
       SET name=$1, unit=$2, default_rate=$3, updated_at=now()
     WHERE id=$4
     RETURNING *`,
    [name, unit, default_rate, id]
  );
  return Response.json(rows[0]);
}
