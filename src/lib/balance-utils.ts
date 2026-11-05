import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Calcula o delta financeiro do saldo baseado no tipo de transação.
 * - income: +amount
 * - expense / credit_card_expense: -amount
 * - transfer (sem parentTransactionId = Saída): -amount
 * - transfer (com parentTransactionId = Entrada): +amount
 */
export function calculateBalanceDelta(
  amount: number | string,
  type: string,
  status: string,
  parentTransactionId?: number | null,
  isRevert: boolean = false,
): number {
  if (status !== "paid") return 0;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount === 0) return 0;

  let delta = 0;
  if (type === "income") {
    delta = numAmount;
  } else if (type === "expense" || type === "credit_card_expense") {
    delta = -numAmount;
  } else if (type === "transfer") {
    delta = !parentTransactionId ? -numAmount : numAmount;
  }

  if (delta === 0) return 0;
  return isRevert ? -delta : delta;
}

/**
 * Atualiza de forma atômica o saldo de uma conta bancária via SQL direto,
 * evitando condições de corrida (Lost Updates) causadas por SELECT + cálculo em memória + UPDATE.
 */
export async function applyBalanceDelta(
  tx: DBTransaction,
  accountId: number | null | undefined,
  amount: number | string,
  type: string,
  status: string,
  parentTransactionId?: number | null,
  isRevert: boolean = false,
  userId?: string,
): Promise<number> {
  if (!accountId || status !== "paid") return 0;

  const delta = calculateBalanceDelta(amount, type, status, parentTransactionId, isRevert);
  if (delta === 0) return 0;

  const whereClause = userId
    ? and(eq(accounts.id, accountId), eq(accounts.userId, userId))
    : eq(accounts.id, accountId);

  await tx
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(whereClause);

  return delta;
}
