// /app/api/account/change-password/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { sql } from "@vercel/postgres";
import bcrypt from "bcrypt";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const email = session.user.email.toLowerCase();

    const { rows } = await sql`
      SELECT id, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const ok = await bcrypt.compare(
      currentPassword,
      user.password_hash || ""
    );

    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users
      SET password_hash = ${newHash}
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ACCOUNT][CHANGE_PASSWORD][ERROR]", err);
    return NextResponse.json(
      { error: "Could not change password." },
      { status: 500 }
    );
  }
}
