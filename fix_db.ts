import { db } from './src/db';
import { transactions, settings } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { parseISO, format, addMonths, getDate } from 'date-fns';

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), 'yyyy-MM');
  }
  return format(date, 'yyyy-MM');
}

async function fix() {
  const allTxs = await db.select().from(transactions);
  const allSettings = await db.select().from(settings);
  
  const userClosingDays = new Map<string, number>();
  for (const s of allSettings) {
    userClosingDays.set(s.userId, s.closingDay || 25);
  }

  let count = 0;
  for (const tx of allTxs) {
    const closingDay = userClosingDays.get(tx.userId) || 25;
    const parsedDate = parseISO(tx.date);
    const correctMonth = getCompetencyMonth(parsedDate, closingDay);
    
    if (tx.competencyMonth !== correctMonth) {
      await db.update(transactions)
        .set({ competencyMonth: correctMonth })
        .where(eq(transactions.id, tx.id));
      count++;
    }
  }

  console.log(`Updated ${count} transactions.`);
  process.exit(0);
}

fix().catch(console.error);
