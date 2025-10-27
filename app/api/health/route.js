import { q } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await q("SELECT NOW() AS server_time");
    return new Response(JSON.stringify({ ok: true, server_time: rows[0].server_time }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
