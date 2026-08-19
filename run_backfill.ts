import 'dotenv/config';
import { db } from './src/db';
import { creditCards, transactions } from './src/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { format, parseISO } from 'date-fns';
import { calculateCreditCardDueDate } from './src/lib/utils/competency';

async function run() {
  console.log('Running backfill...');
  
  // Get unique user IDs to backfill
  const txsToUpdate = await db.query.transactions.findMany({
    where: and(
      eq(transactions.type, 'credit_card_expense'),
      isNull(transactions.invoiceMonth)
    ),
  });

  if (txsToUpdate.length === 0) {
    console.log('No transactions to update.');
    return;
  }

  const cards = await db.select().from(creditCards);
  const cardMap = new Map(cards.map(c => [c.id, c]));

  let updatedCount = 0;

  for (const tx of txsToUpdate) {
    let newInvoiceMonth = tx.competencyMonth;

    if (!newInvoiceMonth && tx.creditCardId) {
      const card = cardMap.get(tx.creditCardId);
      if (card) {
        const dueDate = calculateCreditCardDueDate(parseISO(tx.date), card.closingDay, card.dueDay);
        newInvoiceMonth = format(dueDate, "yyyy-MM");
      }
    }

    if (newInvoiceMonth) {
      await db.update(transactions)
        .set({ invoiceMonth: newInvoiceMonth })
        .where(eq(transactions.id, tx.id));
      updatedCount++;
    }
  }

  console.log(`Backfill completed. ${updatedCount} transactions updated.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
