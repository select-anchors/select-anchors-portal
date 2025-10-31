import { requireAdmin } from "@/lib/auth-helpers";
import { q } from "@/lib/db";

export async function PATCH(_req, { params }) {
  await requireAdmin();
  const id = params.id;
  const body = await _req.json();
  const role = body.role;
  if (!["admin","employee","customer"].includes(role))
    return new Response(JSON.stringify({ error: "invalid role" }), { status: 400 });

  await q(`UPDATE users SET role=$1, updated_at=now() WHERE id=$2`, [role, id]);
  return new Response(JSON.stringify({ ok: true }));
}

export async function DELETE(_req, { params }) {
  await requireAdmin();
  const id = params.id;
  await q(`DELETE FROM users WHERE id=$1`, [id]);
  return new Response(JSON.stringify({ ok: true }));
}
