// lib/db.js
import { Pool } from "pg";

// Support the common names Neon/Vercel create.
// If your var is named differently, this still tries the usual fallbacks.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.STORAGE_URL; // use if you picked a custom prefix

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Set POSTGRES_URL (or DATABASE_URL/NEON_DATABASE_URL) in Vercel → Project → Settings → Environment Variables."
  );
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function health() {
  const r = await query("select 1 as ok");
  return r.rows?.[0]?.ok === 1;
}
