import { db } from '../src/db';
import { accounts } from '../src/db/schema';

async function main() {
  try {
    const res = await db.select().from(accounts);
    console.log("DB connected successfully. Accounts:", res.length);
    process.exit(0);
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

main();
