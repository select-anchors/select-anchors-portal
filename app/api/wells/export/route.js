import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusFromExpiration(expirationDate, windowDays = 90) {
  const d = daysUntil(expirationDate);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= windowDays) return "expiring";
  return "good";
}

function intParam(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const role = session.user.role || "customer";
  const userId = session.user.id;

  const sp = req.nextUrl.searchParams;

  const search = (sp.get("q") || "").trim();
  const company = (sp.get("company") || "").trim();
  const companyMan = (sp.get("company_man") || "").trim();
  const county = (sp.get("county") || "").trim();
  const state = (sp.get("state") || "").trim();
  const status = (sp.get("status") || "").trim();
  const statusWindow = intParam(sp.get("status_window") || "90", 90);

  const lastTestFrom = (sp.get("last_test_from") || "").trim();
  const lastTestTo = (sp.get("last_test_to") || "").trim();
  const expFrom = (sp.get("exp_from") || "").trim();
  const expTo = (sp.get("exp_to") || "").trim();

  const where = [];
  const params = [];

  function bind(value) {
    params.push(value);
    return `$${params.length}`;
  }

  const expExpr = `COALESCE(w.current_expires_at, t.expires_at)`;
  const lastExpr = `COALESCE(w.current_tested_at, t.tested_at)`;

  if (role === "customer") {
    const userRes = await q(
      `
      SELECT company_name
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    const scopedCompany = userRes.rows?.[0]?.company_name?.trim() || "";

    if (!scopedCompany) {
      return new Response("Lease / Well Name,API,Company Name,Company Man,County,State,Wellhead Coords,Last Test Date,Expiration Date,Status,Days Left\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wells-export.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    where.push(`LOWER(TRIM(COALESCE(w.company_name, ''))) = LOWER(TRIM(${bind(scopedCompany)}))`);
  }

  if (search) {
    const like = `%${search}%`;
    const p1 = bind(like);
    const p2 = bind(like);
    const p3 = bind(like);
    const p4 = bind(like);
    const p5 = bind(like);
    const p6 = bind(like);

    where.push(`
      (
        COALESCE(w.lease_well_name, '') ILIKE ${p1}
        OR COALESCE(w.api, '') ILIKE ${p2}
        OR COALESCE(w.company_name, '') ILIKE ${p3}
        OR COALESCE(w.company_man_name, '') ILIKE ${p4}
        OR COALESCE(w.county, '') ILIKE ${p5}
        OR COALESCE(w.state, '') ILIKE ${p6}
      )
    `);
  }

  if (company && role !== "customer") {
    where.push(`COALESCE(w.company_name, '') ILIKE ${bind(`%${company}%`)}`);
  }

  if (companyMan) {
    where.push(`COALESCE(w.company_man_name, '') ILIKE ${bind(`%${companyMan}%`)}`);
  }

  if (county) {
    where.push(`COALESCE(w.county, '') ILIKE ${bind(`%${county}%`)}`);
  }

  if (state) {
    where.push(`COALESCE(w.state, '') ILIKE ${bind(`%${state}%`)}`);
  }

  if (lastTestFrom) {
    where.push(`${lastExpr} IS NOT NULL AND ${lastExpr}::date >= ${bind(lastTestFrom)}::date`);
  }

  if (lastTestTo) {
    where.push(`${lastExpr} IS NOT NULL AND ${lastExpr}::date <= ${bind(lastTestTo)}::date`);
  }

  if (expFrom) {
    where.push(`${expExpr} IS NOT NULL AND ${expExpr}::date >= ${bind(expFrom)}::date`);
  }

  if (expTo) {
    where.push(`${expExpr} IS NOT NULL AND ${expExpr}::date <= ${bind(expTo)}::date`);
  }

  if (status === "unknown") {
    where.push(`${expExpr} IS NULL`);
  } else if (status === "expired") {
    where.push(`${expExpr} IS NOT NULL AND ${expExpr}::date < CURRENT_DATE`);
  } else if (status === "expiring") {
    where.push(`
      ${expExpr} IS NOT NULL
      AND ${expExpr}::date >= CURRENT_DATE
      AND ${expExpr}::date <= CURRENT_DATE + (${bind(statusWindow)} * INTERVAL '1 day')
    `);
  } else if (status === "good") {
    where.push(`
      ${expExpr} IS NOT NULL
      AND ${expExpr}::date > CURRENT_DATE + (${bind(statusWindow)} * INTERVAL '1 day')
    `);
  }

  const sql = `
    SELECT
      w.lease_well_name,
      w.api,
      w.company_name,
      w.company_man_name,
      w.county,
      w.state,
      w.wellhead_coords,
      TO_CHAR(${lastExpr}, 'YYYY-MM-DD') AS last_test_date,
      TO_CHAR(${expExpr}, 'YYYY-MM-DD') AS expiration_date
    FROM wells w
    LEFT JOIN well_tests t ON t.id = w.current_test_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY COALESCE(w.company_name, '') ASC, COALESCE(w.lease_well_name, '') ASC, COALESCE(w.api, '') ASC
    LIMIT 5000
  `;

  const { rows } = await q(sql, params);

  const header = [
    "Lease / Well Name",
    "API",
    "Company Name",
    "Company Man",
    "County",
    "State",
    "Wellhead Coords",
    "Last Test Date",
    "Expiration Date",
    "Status",
    "Days Left",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    const exp = row.expiration_date || null;
    const computedStatus = statusFromExpiration(exp, statusWindow);
    const computedDays = daysUntil(exp);

    lines.push([
      csvEscape(row.lease_well_name),
      csvEscape(row.api),
      csvEscape(row.company_name),
      csvEscape(row.company_man_name),
      csvEscape(row.county),
      csvEscape(row.state),
      csvEscape(row.wellhead_coords),
      csvEscape(row.last_test_date),
      csvEscape(row.expiration_date),
      csvEscape(computedStatus),
      csvEscape(computedDays),
    ].join(","));
  }

  const csv = `${lines.join("\n")}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wells-export.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
