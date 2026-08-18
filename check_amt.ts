import { db } from './src/db/index';
import { transactions } from './src/db/schema';

async function run() {
  const txs = await db.query.transactions.findMany({
    where: (t, { eq, or }) => or(eq(t.amount, '40.80'), eq(t.amount, '40.8'))
  });
  console.log(`Found ${txs.length} transactions with amt 40.80`);
  for (const tx of txs) {
    console.log(`  txId: ${tx.id}, date: ${tx.date}, comp: ${tx.competencyMonth}, type: ${tx.type}, desc: ${tx.description}, cardId: ${tx.creditCardId}`);
  }
  process.exit(0);
}

run().catch(console.error);
