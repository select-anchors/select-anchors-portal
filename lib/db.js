// lib/db.js
import { Pool } from "pg";

const url =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL; // fallback if someone set DATABASE_URL instead

if (!url) {
  throw new Error("Missing POSTGRES_URL (or DATABASE_URL) env var");
}

// Neon + Vercel-friendly Pool
export const pool = new Pool({
  connectionString: url,
  // Neon requires SSL; Vercel’s Linux cert chain is fine with this:
  ssl: { rejectUnauthorized: false },
  max: 5,               // serverless-friendly
  idleTimeoutMillis: 0, // don’t keep idle clients around
  connectionTimeoutMillis: 10_000,
});

// Small helper with basic logging
export async function q(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } catch (err) {
    console.error("DB QUERY ERROR:", err?.message || err);
    throw err;
  } finally {
    client.release();
  }
}
