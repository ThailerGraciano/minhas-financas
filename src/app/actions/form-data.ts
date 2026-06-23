'use server';

import { db } from '@/db';
import { accounts, creditCards, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export async function getTransactionFormData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const accs = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  
  let cats = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    with: { subcategories: true },
  });
  
  // Create a default category se não existir para evitar bloqueio
  if (cats.length === 0) {
    const [defaultCat] = await db.insert(categories).values({ userId, name: 'Geral', type: 'expense' }).returning();
    cats = [{ ...defaultCat, subcategories: [] }];
  }
  
  return { accounts: accs, creditCards: cards, categories: cats };
}
