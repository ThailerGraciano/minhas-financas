'use server';

import { db } from '@/db';
import { accounts, categories, transactions, fixedTransactions } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';

export async function getAccounts() {
  return await db.select().from(accounts);
}

export async function createAccount(data: typeof accounts.$inferInsert) {
  try {
    await db.insert(accounts).values(data);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error creating account:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function updateAccount(id: number, data: Partial<typeof accounts.$inferInsert>) {
  try {
    await db.update(accounts).set(data).where(eq(accounts.id, id));
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error updating account:', error);
    return { success: false, error: 'Failed to update account' };
  }
}

/**
 * Ajusta o saldo de uma conta inserindo uma transação de ajuste automático.
 * A trigger `trg_transactions_balance_sync` no banco cuida de atualizar
 * `accounts.current_balance` assim que o INSERT ocorrer.
 */
export async function adjustAccountBalance(
  accountId: number,
  realBalance: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Busca conta e saldo atual
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) {
      return { success: false, error: 'Conta não encontrada.' };
    }

    const currentBalance = Number(account.currentBalance);
    const diff = realBalance - currentBalance;

    if (diff === 0) {
      return { success: true }; // Nenhum ajuste necessário
    }

    // 2. Busca ou cria a categoria de sistema "Ajuste de Saldo"
    const ADJUSTMENT_CATEGORY_NAME = 'Ajuste de Saldo';
    const adjustmentType = diff > 0 ? 'income' : 'expense';

    let [adjustCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, ADJUSTMENT_CATEGORY_NAME))
      .limit(1);

    if (!adjustCategory) {
      [adjustCategory] = await db
        .insert(categories)
        .values({ name: ADJUSTMENT_CATEGORY_NAME, type: adjustmentType, icon: 'SlidersHorizontal' })
        .returning();
    }

    // 3. Insere a transação de ajuste (a trigger atualiza o saldo automaticamente)
    const today = format(new Date(), 'yyyy-MM-dd');
    const competencyMonth = format(new Date(), 'yyyy-MM');

    await db.insert(transactions).values({
      type: adjustmentType,
      accountId,
      categoryId: adjustCategory.id,
      amount: Math.abs(diff).toFixed(2),
      description: 'Ajuste de saldo',
      date: today,
      competencyMonth,
      status: 'paid',
    });

    revalidatePath('/accounts');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error adjusting account balance:', error);
    return { success: false, error: 'Falha ao ajustar o saldo.' };
  }
}

// ---------------------------------------------------------------------------
// Tipos auxiliares internos
// ---------------------------------------------------------------------------

type TransactionRow = {
  type: string;
  amount: string;
};

/** Retorna o delta de saldo (positivo = crédito, negativo = débito) de uma lista de transações. */
function calcDelta(rows: TransactionRow[]): number {
  return rows.reduce((acc, row) => {
    const amount = Number(row.amount);
    if (row.type === 'income') return acc + amount;
    if (row.type === 'expense' || row.type === 'credit_card_expense') return acc - amount;
    // 'transfer' – os dois lados (origem e destino) são vinculados à conta,
    // então eles se cancelam. Ignoramos para não contar duas vezes.
    return acc;
  }, 0);
}

/**
 * Calcula o saldo de uma conta em qualquer data (passado ou futuro).
 *
 * - **Passado**: reconstrói o saldo histórico somando todas as transações
 *   com status 'paid' e date <= targetDate.
 * - **Futuro**: parte do `current_balance` e projeta as transações pendentes
 *   (reais + virtuais das fixed_transactions ativas) entre hoje e targetDate.
 *
 * Retorna `null` se a conta não for encontrada.
 */
export async function getHistoricalBalance(
  accountId: number,
  targetDate: Date,
): Promise<number | null> {
  const [account] = await db
    .select({ currentBalance: accounts.currentBalance })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) return null;

  // Normaliza datas para comparação apenas por dia (sem hora)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const targetStr = format(target, 'yyyy-MM-dd');

  // ── PASSADO ────────────────────────────────────────────────────────────────
  if (target <= today) {
    // Reconstrói o saldo somando TODAS as transações pagas até targetDate.
    // Não há `initial_balance` no schema, então este é o saldo desde sempre.
    const paidRows = await db
      .select({ type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.status, 'paid'),
          lte(transactions.date, targetStr),
        ),
      );

    return calcDelta(paidRows);
  }

  // ── FUTURO ─────────────────────────────────────────────────────────────────
  const currentBalance = Number(account.currentBalance);

  // 1. Transações reais já cadastradas, ainda pendentes, entre amanhã e targetDate
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const pendingReal = await db
    .select({ type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.status, 'pending'),
        gte(transactions.date, tomorrowStr),
        lte(transactions.date, targetStr),
      ),
    );

  // 2. Transações virtuais das fixed_transactions (não materializadas no período)
  //    Buscamos as ativas que começaram até targetDate.
  const activeFixed = await db
    .select({
      id:        fixedTransactions.id,
      type:      fixedTransactions.type,
      amount:    fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
      accountId: fixedTransactions.accountId,
    })
    .from(fixedTransactions)
    .where(
      and(
        eq(fixedTransactions.active, true),
        eq(fixedTransactions.accountId, accountId),
        lte(fixedTransactions.startDate, targetStr),
      ),
    );

  // Conjunto de fixed_transaction_ids que já têm transações materializadas
  // entre tomorrowStr e targetStr (para não contar duas vezes)
  const materializedFixedIds = new Set<string>();
  if (activeFixed.length > 0) {
    const materializedRows = await db
      .select({ fixedTransactionId: transactions.fixedTransactionId })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, tomorrowStr),
          lte(transactions.date, targetStr),
        ),
      );

    for (const row of materializedRows) {
      if (row.fixedTransactionId) {
        materializedFixedIds.add(row.fixedTransactionId);
      }
    }
  }

  // Para cada fixed não materializada, conta quantas ocorrências cabem no período
  const virtualRows: TransactionRow[] = [];

  for (const ft of activeFixed) {
    if (materializedFixedIds.has(ft.id)) continue;

    // Itera mês a mês a partir do mês seguinte ao atual até targetDate
    const ftStartDate = new Date(ft.startDate);
    let cursor = new Date(tomorrow);
    // Avança cursor para o dia da fixed no mês corrente ou próximo
    cursor.setDate(ftStartDate.getDate());
    if (cursor < tomorrow) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    while (cursor <= target) {
      virtualRows.push({ type: ft.type, amount: ft.amount });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const futureDelta = calcDelta([...pendingReal, ...virtualRows]);
  return currentBalance + futureDelta;
}
