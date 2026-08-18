import { getTransactions } from './src/app/actions/transactions';

async function run() {
  const txs = await getTransactions("2026-08");
  const santanderTxs = txs.filter(tx => tx.creditCard?.name === "Santander" && tx.type === "credit_card_expense");
  console.log(`Found ${santanderTxs.length} Santander txs for August:`);
  for (const tx of santanderTxs) {
    console.log(`  txId: ${tx.id}, date: ${tx.date}, comp: ${tx.competencyMonth}, amt: ${tx.amount}`);
  }
}
run().catch(console.error);
