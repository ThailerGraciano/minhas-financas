'use server';

import { db } from '@/db';
import { accounts, creditCards, categories } from '@/db/schema';

export async function getTransactionFormData() {
  const accs = await db.select().from(accounts);
  const cards = await db.select().from(creditCards);
  let cats = await db.select().from(categories);
  
  // Create a default category if none exists to avoid blocking the user
  if (cats.length === 0) {
    const [defaultCat] = await db.insert(categories).values({ name: 'Geral' }).returning();
    cats = [defaultCat];
  }
  
  return { accounts: accs, creditCards: cards, categories: cats };
}
