"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, accounts, batchLogs } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

type Transaction = typeof transactions.$inferSelect;
type TransactionChanges = Partial<typeof transactions.$inferInsert>;

type DBTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface BatchUpdateItem {
  id: number;
  changes: TransactionChanges;
  original: Transaction;
}

interface BatchResult {
  success: boolean;
  error?: string;
  summary?: {
    batchId: string;
    updatedCount: number;
    deletedCount: number;
    balanceAdjustments: Array<{
      accountId: number;
      delta: number;
    }>;
  };
}

/**
 * Calcula o delta de saldo que uma transação aplica em sua conta.
 * Retorna valor positivo para income, negativo para expense/credit_card_expense.
 * Retorna 0 se não houver accountId ou se o status não for "paid".
 */
function calculateBalanceDelta(
  amount: number | string,
  type: string,
  status: string,
  accountId: number | null | undefined,
  parentTransactionId: number | null | undefined
): number {
  if (!accountId || status !== "paid") return 0;

  const numAmount = Number(amount);

  if (type === "income") return numAmount;
  if (type === "expense" || type === "credit_card_expense") return -numAmount;
  if (type === "transfer") {
    return parentTransactionId ? numAmount : -numAmount;
  }

  return 0;
}

/**
 * Aplica um delta de saldo em uma conta dentro de uma transação do banco.
 */
async function applyAccountDelta(tx: DBTx, accountId: number, delta: number) {
  if (delta === 0) return;
  await tx
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(eq(accounts.id, accountId));
}

/**
 * Processa atualizações e exclusões em lote de transações.
 *
 * - Todas as operações ocorrem dentro de uma única transação ACID.
 * - Cada operação gera um registro de log na tabela `batch_logs`.
 * - Saldos das contas são recalculados automaticamente quando há mudança de valor, status ou conta.
 */
export async function processBatchUpdates(
  updates: BatchUpdateItem[],
  deletes: Array<{ id: number; original: Transaction }>
): Promise<BatchResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (updates.length === 0 && deletes.length === 0) {
    return { success: true, summary: { batchId: "", updatedCount: 0, deletedCount: 0, balanceAdjustments: [] } };
  }

  const batchId = randomUUID();
  // Acumula os deltas de saldo por conta para retornar no resumo
  const balanceMap = new Map<number, number>();

  function trackBalanceDelta(accountId: number | null | undefined, delta: number) {
    if (!accountId || delta === 0) return;
    balanceMap.set(accountId, (balanceMap.get(accountId) ?? 0) + delta);
  }

  try {
    await db.transaction(async (tx) => {
      // ─── UPDATES ───────────────────────────────────────────
      for (const item of updates) {
        // Verificar que a transação pertence ao usuário
        const [existing] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, item.id), eq(transactions.userId, userId)));

        if (!existing) {
          throw new Error(`Transação ${item.id} não encontrada ou não pertence ao usuário.`);
        }

        // Calcular reversão do saldo antigo
        const oldDelta = calculateBalanceDelta(
          existing.amount,
          existing.type,
          existing.status,
          existing.accountId,
          existing.parentTransactionId
        );

        // Aplicar reversão do saldo antigo
        if (existing.accountId && oldDelta !== 0) {
          await applyAccountDelta(tx, existing.accountId, -oldDelta);
          trackBalanceDelta(existing.accountId, -oldDelta);
        }

        // Executar o UPDATE
        const [updatedTx] = await tx
          .update(transactions)
          .set(item.changes)
          .where(and(eq(transactions.id, item.id), eq(transactions.userId, userId)))
          .returning();

        // Calcular e aplicar novo delta de saldo
        const newDelta = calculateBalanceDelta(
          updatedTx.amount,
          updatedTx.type,
          updatedTx.status,
          updatedTx.accountId,
          updatedTx.parentTransactionId
        );

        if (updatedTx.accountId && newDelta !== 0) {
          await applyAccountDelta(tx, updatedTx.accountId, newDelta);
          trackBalanceDelta(updatedTx.accountId, newDelta);
        }

        // Se a conta mudou, o delta antigo já foi revertido na conta antiga
        // e o novo delta aplicado na conta nova — tudo certo.

        // Inserir log de auditoria
        await tx.insert(batchLogs).values({
          userId,
          batchId,
          transactionId: item.id,
          actionType: "update",
          beforeData: item.original,
          afterData: updatedTx,
        });
      }

      // ─── DELETES ───────────────────────────────────────────
      for (const item of deletes) {
        // Verificar que a transação pertence ao usuário
        const [existing] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, item.id), eq(transactions.userId, userId)));

        if (!existing) {
          throw new Error(`Transação ${item.id} não encontrada ou não pertence ao usuário.`);
        }

        // Reverter o saldo antes de deletar
        const oldDelta = calculateBalanceDelta(
          existing.amount,
          existing.type,
          existing.status,
          existing.accountId,
          existing.parentTransactionId
        );

        if (existing.accountId && oldDelta !== 0) {
          await applyAccountDelta(tx, existing.accountId, -oldDelta);
          trackBalanceDelta(existing.accountId, -oldDelta);
        }

        // Deletar transferência vinculada (se for par de transfer)
        if (existing.type === "transfer") {
          const linkedTx = existing.parentTransactionId
            ? await tx.query.transactions.findFirst({
                where: and(eq(transactions.id, existing.parentTransactionId), eq(transactions.userId, userId)),
              })
            : await tx.query.transactions.findFirst({
                where: and(eq(transactions.parentTransactionId, existing.id), eq(transactions.userId, userId)),
              });

          if (linkedTx) {
            const linkedDelta = calculateBalanceDelta(
              linkedTx.amount,
              linkedTx.type,
              linkedTx.status,
              linkedTx.accountId,
              linkedTx.parentTransactionId
            );

            if (linkedTx.accountId && linkedDelta !== 0) {
              await applyAccountDelta(tx, linkedTx.accountId, -linkedDelta);
              trackBalanceDelta(linkedTx.accountId, -linkedDelta);
            }

            // Deletar a transação vinculada primeiro se ela é filha
            if (linkedTx.parentTransactionId) {
              await tx.delete(transactions).where(eq(transactions.id, linkedTx.id));
            } else {
              // Se o linked é pai, deletar o current primeiro
              await tx.delete(transactions).where(eq(transactions.id, existing.id));
              await tx.delete(transactions).where(eq(transactions.id, linkedTx.id));

              // Log para a transação vinculada
              await tx.insert(batchLogs).values({
                userId,
                batchId,
                transactionId: linkedTx.id,
                actionType: "delete",
                beforeData: linkedTx,
                afterData: null,
              });

              // Log para a transação principal já incluído abaixo, mas o delete já aconteceu
              await tx.insert(batchLogs).values({
                userId,
                batchId,
                transactionId: item.id,
                actionType: "delete",
                beforeData: item.original,
                afterData: null,
              });

              continue; // Skip o delete + log padrão abaixo
            }

            // Log para a transação vinculada
            await tx.insert(batchLogs).values({
              userId,
              batchId,
              transactionId: linkedTx.id,
              actionType: "delete",
              beforeData: linkedTx,
              afterData: null,
            });
          }
        }

        // Deletar a transação principal
        await tx.delete(transactions).where(eq(transactions.id, item.id));

        // Log de auditoria
        await tx.insert(batchLogs).values({
          userId,
          batchId,
          transactionId: item.id,
          actionType: "delete",
          beforeData: item.original,
          afterData: null,
        });
      }
    });

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");

    const balanceAdjustments = Array.from(balanceMap.entries()).map(
      ([accountId, delta]) => ({ accountId, delta })
    );

    return {
      success: true,
      summary: {
        batchId,
        updatedCount: updates.length,
        deletedCount: deletes.length,
        balanceAdjustments,
      },
    };
  } catch (error: unknown) {
    console.error("Error processing batch updates:", error);
    const errorMessage = error instanceof Error ? error.message : "Falha ao processar operações em lote.";
    return { success: false, error: errorMessage };
  }
}
