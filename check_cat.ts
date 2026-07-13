import { db } from './src/db';
import { categories } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function check() {
  const cat = await db.select().from(categories).where(eq(categories.id, 74));
  console.dir(cat, { depth: null });
  process.exit(0);
}

check().catch(console.error);
