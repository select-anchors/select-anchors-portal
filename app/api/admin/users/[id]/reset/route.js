// app/api/admin/users/[id]/reset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { session };
}

export async function POST(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await req.json();

  const password = body.password;

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  await q(
    `
    UPDATE users
    SET password_hash=$1
    WHERE id=$2
    `,
    [hash, params.id]
  );

  return NextResponse.json({
    ok: true,
  });
}
