// app/admin/wells/pending/approve/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const api = searchParams.get("api");
  if (!api) return NextResponse.redirect("/admin/wells/pending");

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells/${encodeURIComponent(api)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
    cache: "no-store",
  });

  return NextResponse.redirect(new URL("/admin/wells/pending", req.url));
}
