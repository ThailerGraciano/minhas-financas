import { db } from './src/db';
import { transactions, fixedTransactions, settings } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function check() {
  console.log("Checking transactions...");
  const txs = await db.select().from(transactions).where(sql`description ILIKE '%Salário%' OR description ILIKE '%Futura%'`);
  console.log("Real transactions:");
  console.dir(txs, { depth: null });

  console.log("Checking fixed transactions...");
  const ftxs = await db.select().from(fixedTransactions).where(sql`description ILIKE '%Salário%' OR description ILIKE '%Futura%'`);
  console.log("Fixed transactions:");
  console.dir(ftxs, { depth: null });

  console.log("Checking user settings...");
  const sets = await db.select().from(settings);
  console.dir(sets, { depth: null });

  process.exit(0);
}

check().catch(console.error);
