import { db } from './src/db';
import { transactions } from './src/db/schema';
import { like } from 'drizzle-orm';

async function main() {
  const res = await db.query.transactions.findMany({
    where: like(transactions.description, '%Salário Futura%')
  });
  console.table(res.map(r => ({id: r.id, date: r.date, comp: r.competencyMonth, status: r.status, amount: r.amount})));
  process.exit(0);
}
main();
