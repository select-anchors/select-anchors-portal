// lib/db.js
import { Pool } from 'pg';

// If your env var is STORAGE_URL, change POSTGRES_URL to STORAGE_URL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export default pool;

// Optional helper if you like:
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
