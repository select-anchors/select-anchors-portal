// lib/db.js
import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL; // handle either name

// Neon requires SSL in serverless environments
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
