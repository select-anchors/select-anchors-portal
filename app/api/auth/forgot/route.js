// app/api/auth/forgot/route.js
import crypto from "crypto";
import nodemailer from "nodemailer";
import { q } from "@/lib/db";

function originFrom(req) {
  // Prefer configured URL; otherwise derive from headers
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return `${proto}://${host}`;
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return Response.json({ ok: true }); // don't leak

    // Always act like it succeeded, but try to set a token if user exists
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const { rowCount } = await q(
      `UPDATE users
          SET reset_token = $1,
              reset_token_expires = $2
        WHERE lower(email) = lower($3)`,
      [token, expires, email]
    );

    // Only send if there is a matching user
    if (rowCount > 0) {
      const base = originFrom(req);
      const link = `${base}/reset?token=${encodeURIComponent(token)}`;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@selectanchors.com",
        to: email,
        subject: "Reset your Select Anchors password",
        text: `Use this link to reset your password: ${link}\nThis link expires in 2 hours.`,
        html: `<p>Use this link to reset your password:</p>
               <p><a href="${link}">${link}</a></p>
               <p>This link expires in 2 hours.</p>`,
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("FORGOT ERROR:", err);
    // Still return ok to avoid user enumeration
    return Response.json({ ok: true });
  }
}
