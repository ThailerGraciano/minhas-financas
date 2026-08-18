import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT id, type, date, \"competencyMonth\", \"creditCardId\" FROM transactions WHERE type='credit_card_expense'");
  console.log("Found", res.rows.length, "transactions");
  for (const row of res.rows) {
    console.log(row.id, row.date, row.competencyMonth, row.creditCardId);
  }
  pool.end();
}

run().catch(console.error);
