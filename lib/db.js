// lib/db.js
import { Pool } from "pg";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL env var");
}

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

// Simple helper
export async function q(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}
