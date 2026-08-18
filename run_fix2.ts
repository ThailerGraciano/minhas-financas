import { db } from './src/db/index';
import { transactions, creditCards, settings } from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { calculateCreditCardDueDate } from './src/lib/utils/competency';
import { format, parseISO, getDate, addMonths, setDate } from 'date-fns';

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

async function run() {
  const allSettings = await db.select().from(settings);
  const userClosingDays = new Map(allSettings.map(s => [s.userId, s.closingDay]));

  const ccTxs = await db.query.transactions.findMany({
    where: eq(transactions.type, 'credit_card_expense'),
    with: { creditCard: true }
  });

  let updatedCount = 0;
  for (const tx of ccTxs) {
    if (!tx.creditCard) continue;
    
    const globalClosingDay = userClosingDays.get(tx.userId) || 21;

    const parsedDate = parseISO(tx.date);
    const dueDate = calculateCreditCardDueDate(parsedDate, tx.creditCard.closingDay, tx.creditCard.dueDay);
    const expectedCompetency = getCompetencyMonth(dueDate, globalClosingDay);

    if (tx.competencyMonth !== expectedCompetency) {
      console.log(`Updating txId ${tx.id} for user ${tx.userId} from ${tx.competencyMonth} to ${expectedCompetency}`);
      await db.update(transactions).set({ competencyMonth: expectedCompetency }).where(eq(transactions.id, tx.id));
      updatedCount++;
    }
  }
  console.log("Updated " + updatedCount + " transactions correctly.");
  process.exit(0);
}

run().catch(console.error);
