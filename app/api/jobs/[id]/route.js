// /app/api/jobs/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const role = session.user.role;

  try {
    const { rows } = await q(
      `
      SELECT j.*
      FROM jobs j
      WHERE j.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const job = rows[0];

    // access control
    if (role === "admin" || role === "employee") {
      return NextResponse.json({ job });
    }

    // customers: only see jobs they created (you can expand this later)
    if (role === "customer") {
      if (job.created_by_user_id && Number(job.created_by_user_id) === userId) {
        return NextResponse.json({ job });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err) {
    console.error("[PUBLIC JOB][GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load job." },
      { status: 500 }
    );
  }
}
