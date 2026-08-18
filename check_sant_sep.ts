import { db } from './src/db/index';
import { transactions, creditCards } from './src/db/schema';
import { eq, and } from 'drizzle-orm';

async function run() {
  const txs = await db.query.transactions.findMany({
    where: and(eq(transactions.creditCardId, 10), eq(transactions.competencyMonth, '2026-09'))
  });
  console.log(`Found ${txs.length} transactions for Santander in 2026-09`);
  for (const tx of txs) {
    console.log(`  txId: ${tx.id}, date: ${tx.date}, comp: ${tx.competencyMonth}, amt: ${tx.amount}, desc: ${tx.description}`);
  }
  process.exit(0);
}

run().catch(console.error);
