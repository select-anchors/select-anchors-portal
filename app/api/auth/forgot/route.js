// app/api/auth/forgot/route.js
import crypto from "crypto";
import nodemailer from "nodemailer";
import { q } from "@/lib/db";

function originFrom(req) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return `${proto}://${host}`;
}

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);

  // If you use Gmail app password: host=smtp.gmail.com, port=465, secure=true
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function POST(req) {
  const { email } = await req.json().catch(() => ({ email: "" }));

  // Always pretend success to avoid enumeration (but still do the work if present)
  try {
    if (email) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      const { rowCount } = await q(
        `UPDATE users
           SET reset_token = $1,
               reset_token_expires = $2
         WHERE lower(email) = lower($3)`,
        [token, expires, email]
      );

      if (rowCount > 0) {
        const base = originFrom(req);
        const link = `${base}/reset?token=${encodeURIComponent(token)}`;

        try {
          const transporter = buildTransport();
          // Verify SMTP connectivity/auth
          await transporter.verify();

          await transporter.sendMail({
            from: process.env.SMTP_FROM || "no-reply@selectanchors.com",
            to: email,
            subject: "Reset your Select Anchors password",
            text: `Use this link to reset your password: ${link}\nThis link expires in 2 hours.`,
            html: `<p>Use this link to reset your password:</p>
                   <p><a href="${link}">${link}</a></p>
                   <p>This link expires in 2 hours.</p>`,
          });

          // Optional debug echo (off by default)
          if (process.env.MAIL_DEBUG === "true") {
            return Response.json({ ok: true, debugResetLink: link });
          }
        } catch (mailErr) {
          console.error("SMTP SEND ERROR:", mailErr);
          // In debug mode, still return the link so you can continue testing
          if (process.env.MAIL_DEBUG === "true") {
            return Response.json({
              ok: true,
              debugResetLink: link,
              note: "Email not sent (see logs). Using debug link.",
            });
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("FORGOT ROUTE ERROR:", e);
    // Still don't leak user presence
    if (process.env.MAIL_DEBUG === "true") {
      return Response.json({ ok: true, error: "Internal error (see logs)" });
    }
    return Response.json({ ok: true });
  }
}
