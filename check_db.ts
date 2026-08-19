import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const res = await sql`SELECT id, type, date, "competencyMonth", "creditCardId" FROM transactions WHERE type='credit_card_expense' LIMIT 20`;
  console.log("Found", res.length, "transactions");
  for (const row of res) {
    console.log(row.id, row.date, row.competencyMonth, row.creditCardId);
  }
  process.exit(0);
}

run().catch(console.error);
