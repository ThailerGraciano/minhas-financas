import { db } from './src/db';
import { settings } from './src/db/schema';
async function main() {
  const res = await db.query.settings.findMany();
  console.table(res);
  process.exit(0);
}
main();
