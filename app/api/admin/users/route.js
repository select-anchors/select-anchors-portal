// /app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { q } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { rows } = await q(
    `SELECT id, name, email, role, is_active, created_at
       FROM users
      ORDER BY created_at DESC`
  );
  return NextResponse.json({ users: rows });
}

export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const { name, email, role = "customer", is_active = true, sendReset = true } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { rows: existing } = await q(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.length) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const { rows } = await q(
      `INSERT INTO users (name, email, role, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [name || null, email, role, !!is_active]
    );

    const user = rows[0];

    if (sendReset) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min
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
        subject: "Set up your Select Anchors password",
        html: `<p>Welcome! Click below to set your password (expires in 30 minutes):</p>
               <p><a href="${resetLink}">Set Password</a></p>`,
      });
    }

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
