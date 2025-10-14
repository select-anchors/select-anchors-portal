// lib/db.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // make sure this matches your Vercel env var name
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export default pool;
