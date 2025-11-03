// /app/api/admin/users/[id]/reset/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { q } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function POST(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = params.id;
    const { rows } = await q(`SELECT id, email FROM users WHERE id = $1`, [id]);
    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30);

    await q(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [user.id, token, expires]
    );

    const resetLink = `${process.env.NEXTAUTH_URL || "https://app.selectanchors.com"}/reset?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Select Anchors" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Reset your Select Anchors password",
      html: `<p>Click below to reset your password (expires in 30 minutes):</p>
             <p><a href="${resetLink}">Reset Password</a></p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
