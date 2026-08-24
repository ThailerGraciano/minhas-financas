/* eslint-disable */
import { getProjectedCashFlow } from "./src/app/actions/planning";
import { db } from "./src/db";
import { accounts } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const projection = await getProjectedCashFlow(undefined, "2026-08");
    
    console.log("Overdue txs:", projection.overdueTransactions.length);
    console.log("Projection days:", projection.projection.length);
    
    const aug28 = projection.projection.find(p => p.date === "2026-08-28");
    console.log("Aug 28th projection:", JSON.stringify(aug28, null, 2));

    const aug10 = projection.overdueTransactions.find(t => t.date === "2026-08-10");
    console.log("Aug 10th overdue:", JSON.stringify(aug10, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}
main();
