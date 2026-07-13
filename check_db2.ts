import { db } from './src/db';
import { transactions } from './src/db/schema';
import { sql, and, eq, gt } from 'drizzle-orm';

async function check() {
  const txs = await db.select().from(transactions).where(and(eq(transactions.competencyMonth, '2026-07'), gt(transactions.date, '2026-07-21')));
  console.dir(txs, { depth: null });
  process.exit(0);
}

check().catch(console.error);
