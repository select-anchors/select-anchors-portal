// app/api/admin/items/[id]/toggle/route.js
import { q } from "@/lib/db";

export async function PATCH(req, { params }) {
  const id = params.id;
  const { is_active } = await req.json();

  const { rows } = await q(
    `UPDATE invoice_items_catalog
       SET is_active=$1, updated_at=now()
     WHERE id=$2
     RETURNING *`,
    [is_active, id]
  );
  return Response.json(rows[0]);
}
