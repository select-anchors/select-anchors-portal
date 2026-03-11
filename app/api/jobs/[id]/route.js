// app/api/jobs/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id; // UUID string

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

    // Staff can see all jobs
    if (role === "admin" || role === "employee") {
      return NextResponse.json({ job });
    }

    // Customers can only see their own jobs
    if (role === "customer") {
      // job.customer_id is UUID
      if (job.customer_id && String(job.customer_id) === String(userId)) {
        return NextResponse.json({ job });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err) {
    console.error("[GET /api/jobs/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
}
