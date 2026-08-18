import { db } from './src/db/index';
import { transactions, creditCards } from './src/db/schema';
import { eq, and } from 'drizzle-orm';

async function run() {
  const cards = await db.select().from(creditCards).where(eq(creditCards.name, 'Santander'));
  if (cards.length === 0) {
    console.log("Santander card not found");
    process.exit(1);
  }
  
  for (const card of cards) {
    console.log(`Santander Card ID: ${card.id}, User: ${card.userId}, Closing: ${card.closingDay}, Due: ${card.dueDay}`);
    const txs = await db.query.transactions.findMany({
      where: and(eq(transactions.creditCardId, card.id), eq(transactions.type, 'credit_card_expense'))
    });
    console.log(`Found ${txs.length} transactions for this card`);
    for (const tx of txs) {
      console.log(`  txId: ${tx.id}, date: ${tx.date}, comp: ${tx.competencyMonth}, amt: ${tx.amount}, desc: ${tx.description}`);
    }
  }
  process.exit(0);
}

run().catch(console.error);
