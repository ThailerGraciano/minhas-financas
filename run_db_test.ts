import { db } from "./src/db";
import { transactions, creditCards, fixedTransactions } from "./src/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const allCards = await db.select().from(creditCards);
  console.log("Cards:");
  allCards.forEach(c => console.log(`  ${c.id}: ${c.name} (Due: ${c.dueDay}, Closing: ${c.closingDay})`));

  const nubankCard = allCards.find(c => c.name.toLowerCase().includes("nubank"));
  if (!nubankCard) return console.log("Nubank card not found");

  const cardTxs = await db.select().from(transactions).where(
    and(
      eq(transactions.creditCardId, nubankCard.id),
      eq(transactions.competencyMonth, "2026-08")
    )
  );

  console.log(`\nFound ${cardTxs.length} real txs for Nubank in 2026-08:`);
  let pendingSum = 0;
  let paidSum = 0;
  cardTxs.forEach(t => {
    console.log(`  [${t.status}] ${t.date} - ${t.description} (R$ ${t.amount})`);
    if (t.status === "pending") pendingSum += Number(t.amount);
    else paidSum += Number(t.amount);
  });

  console.log(`\nTotals -> Pending: ${pendingSum}, Paid: ${paidSum}`);
}
main().catch(console.error);
