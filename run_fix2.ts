import { config } from 'dotenv';
config({ path: '.env.local' });


import { db } from './src/db/index';
import { transactions, settings, creditCards } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { calculateCreditCardDueDate } from './src/lib/utils/competency';
import { format, parseISO, addMonths, getDate } from 'date-fns';

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

async function run() {
  console.log("Running fixAllCompetencies...");
  const userId = '3d833db0-7683-43f0-94b4-20e7f1a1511d'; // The user's ID from previous logs

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allTxs = await db.select().from(transactions).where(eq(transactions.userId, userId));
  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const cardMap = new Map(cards.map(c => [c.id, c]));
  
  let updatedCount = 0;

  for (const tx of allTxs) {
    const parsedDate = parseISO(tx.date);
    let correctCompetency: string;

    if (tx.type === 'credit_card_expense' && tx.creditCardId) {
      const card = cardMap.get(tx.creditCardId);
      if (!card) continue;
      const dueDate = calculateCreditCardDueDate(parsedDate, card.closingDay, card.dueDay);
      correctCompetency = format(dueDate, "yyyy-MM");
    } else {
      correctCompetency = getCompetencyMonth(parsedDate, closingDay);
    }

    if (tx.competencyMonth !== correctCompetency) {
      console.log(`Fixing tx ${tx.id} from ${tx.competencyMonth} to ${correctCompetency}`);
      await db.update(transactions).set({ competencyMonth: correctCompetency }).where(eq(transactions.id, tx.id));
      updatedCount++;
    }
  }

  console.log("Result: fixed " + updatedCount + " transactions");
  process.exit(0);
}

run().catch(console.error);
