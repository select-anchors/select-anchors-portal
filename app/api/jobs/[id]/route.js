// /app/api/jobs/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // IMPORTANT: users.id is UUID → treat as string, never Number()
  const userId = String(session.user.id);
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

    // Staff can view any job
    if (role === "admin" || role === "employee") {
      return NextResponse.json({ job });
    }

    // Customers: allow access if they are the customer OR creator
    // (You can tighten this later when workflow is finalized)
    const isCustomerMatch = job.customer_id && String(job.customer_id) === userId;
    const isCreatorMatch = job.created_by && String(job.created_by) === userId;
    const isCreatorUserIdMatch =
      job.created_by_user_id && String(job.created_by_user_id) === userId;

    if (role === "customer") {
      if (isCustomerMatch || isCreatorMatch || isCreatorUserIdMatch) {
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
