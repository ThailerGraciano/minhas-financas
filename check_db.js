/* eslint-disable */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/minhas_financas' });
require('dotenv').config({ path: '.env.local' });

async function check() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await p.query('SELECT description, "installment_current", "installment_total" FROM transactions WHERE "installment_total" > 1 LIMIT 10');
  console.log(res.rows);
  p.end();
}
check();
