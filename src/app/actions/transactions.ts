"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, creditCards, fixedTransactions, settings, transactions } from "@/db/schema";
import { buildGlobalCompetencyCondition } from "@/lib/competency-utils";
import { addMonths, endOfMonth, format, getDate, parseISO, subMonths } from "date-fns";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type NewTransaction = typeof transactions.$inferInsert;
type CreateTransactionInput = Omit<NewTransaction, "userId"> & {
  destinationAccountId?: number;
  isFixed?: boolean;
  isTotalAmount?: boolean;
  current_installment?: number;
};

type DBTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

async function applyBalanceDelta(
  tx: DBTx,
  accountId: number | null | undefined,
  amount: number | string,
  type: string,
  status: string,
  parentTransactionId?: number | null,
  isRevert = false,
) {
  if (!accountId || status !== "paid") return;

  let delta = 0;
  const numAmount = Number(amount);

  if (type === "income") {
    delta = numAmount;
  } else if (type === "expense" || type === "credit_card_expense") {
    delta = -numAmount;
  } else if (type === "transfer") {
    if (!parentTransactionId) {
      delta = -numAmount; // Saída
    } else {
      delta = numAmount; // Entrada
    }
  }

  if (delta === 0) return;
  if (isRevert) delta = -delta;

  await tx
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(eq(accounts.id, accountId));
}

const transactionSchema = z
  .object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.string().refine((val) => Number(val) > 0, "Valor deve ser maior que zero"),
    date: z.string().min(1, "Data é obrigatória"),
    competencyMonth: z.string().min(1),
    categoryId: z.number().int().positive("Categoria é obrigatória").optional(),
    type: z.string().min(1),
    status: z.string().min(1),
    isTotalAmount: z.boolean().optional().default(false),
    installmentTotal: z.coerce.number().optional(),
    current_installment: z.coerce.number().min(1).default(1),
    invoiceMonth: z.string().nullable().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.type === "credit_card_expense") {
      if (!data.invoiceMonth || !/^\d{4}-\d{2}$/.test(data.invoiceMonth)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a fatura do cartão",
          path: ["invoiceMonth"],
        });
      }
    } else {
      data.invoiceMonth = null;
    }

    if (data.installmentTotal && data.current_installment > data.installmentTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A parcela inicial não pode ser maior que o total de parcelas.",
        path: ["current_installment"],
      });
    }
    if (data.type !== "transfer" && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Categoria é obrigatória",
        path: ["categoryId"],
      });
    }
  });

const subcategoryRequiredTypes = ["income", "expense", "credit_card_expense"];

export async function getTransactions(month?: string, accountId?: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), "yyyy-MM");

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const userCards = await db.query.creditCards.findMany({
    where: eq(creditCards.userId, userId),
    columns: { id: true, dueDay: true },
  });

  const condition = buildGlobalCompetencyCondition(currentMonth, closingDay, userId, userCards);
  let finalCondition = condition;
  if (accountId) {
    finalCondition = and(condition, eq(transactions.accountId, accountId)) as typeof condition;
  }

  const realTransactions = await db.query.transactions.findMany({
    where: finalCondition,
    with: {
      account: true,
      category: true,
      creditCard: true,
    },
    // Forced recompile to clear Next.js cache
    orderBy: (t, { desc }) => [desc(t.date)],
  });

  const monthDate = parseISO(`${currentMonth}-01`);
  const lastDayOfMonth = format(endOfMonth(monthDate), "yyyy-MM-dd");

  let fixedCondition = and(
    eq(fixedTransactions.active, true),
    lte(fixedTransactions.startDate, lastDayOfMonth),
    eq(fixedTransactions.userId, userId),
  );
  if (accountId) {
    fixedCondition = and(fixedCondition, eq(fixedTransactions.accountId, accountId)) as typeof fixedCondition;
  }

  const activeFixedTxs = await db.query.fixedTransactions.findMany({
    where: fixedCondition,
    with: {
      account: true,
      category: true,
      creditCard: true,
      destinationAccount: true,
    },
  });

  const materializedFixedIds = new Set(
    realTransactions.filter((t) => t.fixedTransactionId).map((t) => t.fixedTransactionId),
  );

  const virtualTransactions = activeFixedTxs
    .filter((ft) => !materializedFixedIds.has(ft.id))
    .flatMap((ft) => {
      const dayStr = ft.startDate.split("-")[2];
      const dayNum = parseInt(dayStr, 10);

      let targetMonthDate = new Date(monthDate);
      if (dayNum > closingDay) {
        targetMonthDate = subMonths(targetMonthDate, 1);
      }

      const targetDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), dayNum);
      const finalDate = targetDate.getMonth() !== targetMonthDate.getMonth() ? endOfMonth(targetMonthDate) : targetDate;
      const dateStr = format(finalDate, "yyyy-MM-dd");

      if (dateStr < ft.startDate) return [];

      const tempId = -Math.floor(Math.random() * 1000000) - 1;

      const origin: (typeof realTransactions)[0] = {
        id: tempId,
        userId: userId,
        type: ft.type,
        accountId: ft.accountId,
        creditCardId: ft.creditCardId,
        categoryId: ft.categoryId,
        subcategoryId: ft.subcategoryId,
        amount: ft.amount,
        description: ft.type === "transfer" ? `${ft.description} (Saída)` : ft.description,
        date: dateStr,
        competencyMonth: currentMonth,
        invoiceMonth: ft.type === "credit_card_expense" ? currentMonth : null,
        status: "pending",
        isFixed: false,
        fixedTransactionId: ft.id,
        installmentCurrent: null,
        installmentTotal: null,
        parentTransactionId: null,
        installmentParentId: null,
        observations: null,
        paidAt: null,
        importHash: null,
        account: ft.account,
        category: ft.category,
        creditCard: ft.creditCard,
      };

      if (ft.type === "transfer" && ft.destinationAccountId) {
        const dest: (typeof realTransactions)[0] = {
          ...origin,
          id: tempId - 1,
          accountId: ft.destinationAccountId,
          description: `${ft.description} (Entrada)`,
          parentTransactionId: origin.id,
          account: ft.destinationAccount,
        };
        return [origin, dest];
      }

      return [origin];
    });

  const allTransactions = [...realTransactions, ...virtualTransactions].filter((t) => t.status !== "ignored");

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allTransactions;
}

export async function createTransaction(
  data: CreateTransactionInput,
): Promise<{ success: boolean; parentId?: number; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Dados inválidos";
    return { success: false, error: firstError };
  }

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;
  const parsedDate = parseISO(data.date);

  if (data.type === "credit_card_expense") {
    if (data.invoiceMonth) {
      data.competencyMonth = data.invoiceMonth;
    } else if (!data.competencyMonth) {
      data.competencyMonth = getCompetencyMonth(parsedDate, closingDay);
    }
  } else {
    data.invoiceMonth = null;
    data.competencyMonth = getCompetencyMonth(parsedDate, closingDay);
  }

  if (subcategoryRequiredTypes.includes(data.type) && (!data.subcategoryId || data.subcategoryId <= 0)) {
    return { success: false, error: "Subcategoria é obrigatória para receitas e despesas" };
  }

  try {
    const { isFixed, destinationAccountId, isTotalAmount, current_installment, ...txData } = data;
    const isTransfer = txData.type === "transfer" && destinationAccountId;

    if (isTransfer && !txData.categoryId) {
      const { categories } = await import("@/db/schema");
      const [cat] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.type, "transfer")))
        .limit(1);
      if (cat) {
        txData.categoryId = cat.id;
      } else {
        const [newCat] = await db
          .insert(categories)
          .values({ userId, name: "Transferência", type: "transfer", icon: "arrow-right-left" })
          .returning();
        txData.categoryId = newCat.id;
      }
    }

    if (isFixed) {
      const result = await db.transaction(async (tx) => {
        const [fixedTx] = await tx
          .insert(fixedTransactions)
          .values({
            userId,
            type: txData.type,
            accountId: txData.accountId!,
            creditCardId: txData.creditCardId || null,
            categoryId: txData.categoryId,
            subcategoryId: txData.subcategoryId || null,
            amount: txData.amount,
            description: txData.description,
            startDate: txData.date,
            active: true,
            destinationAccountId: destinationAccountId || null,
          })
          .returning();

        const baseDate = parseISO(txData.date);
        const baseCompetency = parseISO(`${txData.competencyMonth}-01`);

        for (let i = 0; i < 12; i++) {
          const nextDate = addMonths(baseDate, i);
          const nextCompetency = addMonths(baseCompetency, i);

          if (isTransfer) {
            const status = i === 0 ? txData.status || "pending" : "pending";
            const [originTx] = await tx
              .insert(transactions)
              .values({
                ...txData,
                userId,
                description: `${txData.description} (Saída)`,
                date: format(nextDate, "yyyy-MM-dd"),
                competencyMonth: format(nextCompetency, "yyyy-MM"),
                status,
                fixedTransactionId: fixedTx.id,
              })
              .returning();
            await applyBalanceDelta(tx, txData.accountId, txData.amount, txData.type, status, null);

            await tx.insert(transactions).values({
              ...txData,
              userId,
              accountId: destinationAccountId,
              description: `${txData.description} (Entrada)`,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextCompetency, "yyyy-MM"),
              status,
              fixedTransactionId: fixedTx.id,
              parentTransactionId: originTx.id,
            });
            await applyBalanceDelta(tx, destinationAccountId, txData.amount, txData.type, status, originTx.id);
          } else {
            const status = i === 0 ? txData.status || "pending" : "pending";
            await tx.insert(transactions).values({
              ...txData,
              userId,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextCompetency, "yyyy-MM"),
              status,
              fixedTransactionId: fixedTx.id,
            });
            await applyBalanceDelta(tx, txData.accountId, txData.amount, txData.type, status, null);
          }
        }
        return { success: true };
      });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    }

    if (txData.installmentTotal && txData.installmentTotal > 1) {
      const totalInstallments = txData.installmentTotal;
      let baseParcelAmount = txData.amount;
      let lastParcelAmount = txData.amount;

      if (isTotalAmount) {
        const total = Number(txData.amount);
        const installmentValue = Math.round((total / totalInstallments) * 100) / 100;
        baseParcelAmount = installmentValue.toFixed(2);

        const sumWithoutLast = installmentValue * (totalInstallments - 1);
        const lastValue = Math.round((total - sumWithoutLast) * 100) / 100;
        lastParcelAmount = lastValue.toFixed(2);
      }

      const currentInstallment = current_installment || 1;

      const result = await db.transaction(async (tx) => {
        let originParentId: number | null = null;
        let destParentId: number | null = null;
        let finalReturnId: number | undefined = undefined;

        if (isTransfer) {
          const [originTx] = await tx
            .insert(transactions)
            .values({
              ...txData,
              description: `${txData.description} (${currentInstallment}/${totalInstallments}) (Saída)`,
              userId,
              amount: currentInstallment === totalInstallments ? lastParcelAmount : baseParcelAmount,
              installmentCurrent: currentInstallment,
            })
            .returning();
          originParentId = originTx.id;
          finalReturnId = originTx.id;
          await applyBalanceDelta(
            tx,
            txData.accountId,
            originTx.amount,
            originTx.type,
            originTx.status || "pending",
            null,
          );

          const [destTx] = await tx
            .insert(transactions)
            .values({
              ...txData,
              accountId: destinationAccountId,
              description: `${txData.description} (${currentInstallment}/${totalInstallments}) (Entrada)`,
              userId,
              amount: currentInstallment === totalInstallments ? lastParcelAmount : baseParcelAmount,
              installmentCurrent: currentInstallment,
              parentTransactionId: originTx.id,
            })
            .returning();
          destParentId = destTx.id;
          await applyBalanceDelta(
            tx,
            destinationAccountId,
            destTx.amount,
            destTx.type,
            destTx.status || "pending",
            originTx.id,
          );
        } else {
          const [parentTx] = await tx
            .insert(transactions)
            .values({
              ...txData,
              description: `${txData.description} (${currentInstallment}/${totalInstallments})`,
              userId,
              amount: currentInstallment === totalInstallments ? lastParcelAmount : baseParcelAmount,
              installmentCurrent: currentInstallment,
            })
            .returning();
          originParentId = parentTx.id;
          finalReturnId = parentTx.id;
          await applyBalanceDelta(
            tx,
            txData.accountId,
            parentTx.amount,
            parentTx.type,
            parentTx.status || "pending",
            null,
          );
        }

        const baseDate = parseISO(data.date);
        const baseCompetency = txData.competencyMonth ? parseISO(`${txData.competencyMonth}-01`) : baseDate;

        for (let i = currentInstallment + 1; i <= totalInstallments; i++) {
          const nextDate = addMonths(baseDate, i - currentInstallment);
          const nextCompetency = addMonths(baseCompetency, i - currentInstallment);
          const isLast = i === totalInstallments;

          if (isTransfer) {
            const [originTx] = await tx
              .insert(transactions)
              .values({
                ...txData,
                description: `${txData.description} (${i}/${totalInstallments}) (Saída)`,
                userId,
                amount: isLast ? lastParcelAmount : baseParcelAmount,
                date: format(nextDate, "yyyy-MM-dd"),
                competencyMonth: format(nextCompetency, "yyyy-MM"),
                status: "pending",
                installmentCurrent: i,
                installmentParentId: originParentId,
              })
              .returning();

            await tx.insert(transactions).values({
              ...txData,
              accountId: destinationAccountId,
              description: `${txData.description} (${i}/${totalInstallments}) (Entrada)`,
              userId,
              amount: isLast ? lastParcelAmount : baseParcelAmount,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextCompetency, "yyyy-MM"),
              status: "pending",
              installmentCurrent: i,
              parentTransactionId: originTx.id,
              installmentParentId: destParentId,
            });
          } else {
            await tx.insert(transactions).values({
              ...txData,
              description: `${txData.description} (${i}/${totalInstallments})`,
              userId,
              amount: isLast ? lastParcelAmount : baseParcelAmount,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextCompetency, "yyyy-MM"),
              status: "pending",
              installmentCurrent: i,
              installmentParentId: originParentId,
            });
          }
        }
        return { success: true, parentId: finalReturnId };
      });
      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    }

    if (isTransfer) {
      const result = await db.transaction(async (tx) => {
        const [originTx] = await tx
          .insert(transactions)
          .values({
            ...txData,
            userId,
            description: `${txData.description} (Saída)`,
          })
          .returning();
        await applyBalanceDelta(tx, txData.accountId, txData.amount, txData.type, txData.status || "pending", null);

        const [destTx] = await tx
          .insert(transactions)
          .values({
            ...txData,
            userId,
            accountId: destinationAccountId,
            description: `${txData.description} (Entrada)`,
            parentTransactionId: originTx.id,
          })
          .returning();
        await applyBalanceDelta(
          tx,
          destinationAccountId,
          txData.amount,
          txData.type,
          txData.status || "pending",
          originTx.id,
        );

        return { success: true, parentId: originTx.id };
      });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(transactions).values({ ...txData, userId });
        await applyBalanceDelta(tx, txData.accountId, txData.amount, txData.type, txData.status || "pending", null);
      });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return { success: true };
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

async function changeTransactionStatus(id: number, newStatus: "paid" | "pending") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  return await db.transaction(async (tx) => {
    const [transactionItem] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    if (!transactionItem) {
      throw new Error("Transação não encontrada");
    }

    if (transactionItem.status === newStatus) {
      return { success: true };
    }

    const paidAt = newStatus === "paid" ? new Date() : null;

    if (transactionItem.type === "transfer") {
      const otherTx = transactionItem.parentTransactionId
        ? await tx.query.transactions.findFirst({
            where: and(eq(transactions.id, transactionItem.parentTransactionId), eq(transactions.userId, userId)),
          })
        : await tx.query.transactions.findFirst({
            where: and(eq(transactions.parentTransactionId, transactionItem.id), eq(transactions.userId, userId)),
          });

      const originTx = transactionItem.parentTransactionId ? otherTx : transactionItem;
      const destTx = transactionItem.parentTransactionId ? transactionItem : otherTx;

      if (originTx && destTx) {
        await tx.update(transactions).set({ status: newStatus, paidAt }).where(eq(transactions.id, originTx.id));
        await applyBalanceDelta(
          tx,
          originTx.accountId,
          originTx.amount,
          originTx.type,
          "paid",
          null,
          newStatus === "pending",
        );

        await tx.update(transactions).set({ status: newStatus, paidAt }).where(eq(transactions.id, destTx.id));
        await applyBalanceDelta(
          tx,
          destTx.accountId,
          destTx.amount,
          destTx.type,
          "paid",
          originTx.id,
          newStatus === "pending",
        );
      } else {
        await tx.update(transactions).set({ status: newStatus, paidAt }).where(eq(transactions.id, id));
        await applyBalanceDelta(
          tx,
          transactionItem.accountId,
          transactionItem.amount,
          transactionItem.type,
          "paid",
          transactionItem.parentTransactionId,
          newStatus === "pending",
        );
      }
    } else {
      await tx.update(transactions).set({ status: newStatus, paidAt }).where(eq(transactions.id, id));
      await applyBalanceDelta(
        tx,
        transactionItem.accountId,
        transactionItem.amount,
        transactionItem.type,
        "paid",
        transactionItem.parentTransactionId,
        newStatus === "pending",
      );
    }

    return { success: true };
  });
}

export async function markTransactionAsPaid(id: string | number) {
  try {
    const result = await changeTransactionStatus(Number(id), "paid");
    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return result;
  } catch (error) {
    console.error("Error marking transaction as paid:", error);
    return { success: false, error: "Failed to update transaction" };
  }
}

export async function toggleTransactionStatus(
  id: string | number,
  currentStatus: string,
  isFixedVirtual: boolean = false,
  virtualData?: {
    type: string;
    accountId: number | null;
    creditCardId: number | null;
    categoryId: number;
    subcategoryId: number | null;
    amount: string;
    description: string;
    date: string;
    competencyMonth: string;
    fixedTransactionId: string | null;
  },
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    if (isFixedVirtual && virtualData) {
      await payVirtualTransaction(virtualData);
      return { success: true, newStatus: "paid" };
    }

    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    const result = await changeTransactionStatus(Number(id), newStatus);

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return { ...result, newStatus };
  } catch (error) {
    console.error("Error toggling transaction status:", error);
    return { success: false, error: "Failed to toggle transaction status" };
  }
}

export async function payVirtualTransaction(txData: {
  type: string;
  accountId: number | null;
  creditCardId: number | null;
  categoryId: number;
  subcategoryId: number | null;
  amount: string;
  description: string;
  date: string;
  competencyMonth: string;
  fixedTransactionId: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    if (txData.type === "transfer" && txData.fixedTransactionId) {
      const ft = await db.query.fixedTransactions.findFirst({
        where: and(eq(fixedTransactions.id, txData.fixedTransactionId), eq(fixedTransactions.userId, userId)),
      });
      if (ft && ft.destinationAccountId) {
        await db.transaction(async (tx) => {
          const [originTx] = await tx
            .insert(transactions)
            .values({
              userId,
              type: "transfer",
              accountId: ft.accountId,
              categoryId: ft.categoryId,
              subcategoryId: ft.subcategoryId,
              amount: ft.amount,
              description: `${ft.description} (Saída)`,
              date: txData.date,
              competencyMonth: txData.competencyMonth,
              status: "paid",
              paidAt: new Date(),
              fixedTransactionId: ft.id,
            })
            .returning();

          await applyBalanceDelta(tx, ft.accountId, ft.amount, "transfer", "paid", null);

          const [destTx] = await tx
            .insert(transactions)
            .values({
              userId,
              type: "transfer",
              accountId: ft.destinationAccountId,
              categoryId: ft.categoryId,
              subcategoryId: ft.subcategoryId,
              amount: ft.amount,
              description: `${ft.description} (Entrada)`,
              date: txData.date,
              competencyMonth: txData.competencyMonth,
              status: "paid",
              paidAt: new Date(),
              fixedTransactionId: ft.id,
              parentTransactionId: originTx.id,
            })
            .returning();

          await applyBalanceDelta(tx, ft.destinationAccountId, ft.amount, "transfer", "paid", originTx.id);
        });
      }
    } else {
      await db.transaction(async (tx) => {
        const [insertedTx] = await tx
          .insert(transactions)
          .values({
            userId,
            type: txData.type,
            accountId: txData.accountId,
            creditCardId: txData.creditCardId,
            categoryId: txData.categoryId,
            subcategoryId: txData.subcategoryId,
            amount: txData.amount,
            description: txData.description,
            date: txData.date,
            competencyMonth: txData.competencyMonth,
            status: "paid",
            paidAt: new Date(),
            fixedTransactionId: txData.fixedTransactionId || null,
          })
          .returning();

        await applyBalanceDelta(tx, txData.accountId, txData.amount, txData.type, "paid", null);
      });
    }

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return { success: true };
  } catch (error) {
    console.error("Error paying virtual transaction:", error);
    return { success: false, error: "Failed to pay virtual transaction" };
  }
}

export async function getCreditCardInvoices(creditCardId: number, month?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), "yyyy-MM");

  return await db.query.transactions.findMany({
    where: (t, { eq, and }) =>
      and(
        eq(t.creditCardId, creditCardId),
        eq(t.type, "credit_card_expense"),
        or(eq(t.invoiceMonth, currentMonth), and(isNull(t.invoiceMonth), eq(t.competencyMonth, currentMonth))),
        eq(t.userId, userId),
      ),
    with: {
      category: true,
      subcategory: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });
}

export async function getCreditCardInvoiceMonths(creditCardId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const txs = await db.query.transactions.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.creditCardId, creditCardId), eq(t.type, "credit_card_expense"), eq(t.userId, userId)),
    columns: { invoiceMonth: true, competencyMonth: true },
  });

  const uniqueMonths = [
    ...new Set(txs.map((t) => t.invoiceMonth || t.competencyMonth).filter((m): m is string => Boolean(m))),
  ];
  return uniqueMonths.sort().reverse();
}

export async function deleteTransaction(
  id: number,
  mode: "single" | "future" = "single",
  isFixedVirtual: boolean = false,
  fixedTransactionId?: string,
  virtualDate?: string,
  virtualCompetencyMonth?: string,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const [transactionItem] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

      if (!transactionItem) {
        if (isFixedVirtual && fixedTransactionId) {
          if (mode === "future") {
            await tx
              .update(fixedTransactions)
              .set({ active: false })
              .where(eq(fixedTransactions.id, fixedTransactionId));
            await tx
              .delete(transactions)
              .where(and(eq(transactions.fixedTransactionId, fixedTransactionId), eq(transactions.status, "pending")));
            return { success: true };
          } else if (mode === "single" && virtualDate && virtualCompetencyMonth) {
            // Se for single, pegamos os dados originais da fixed_transaction
            const [ft] = await tx.select().from(fixedTransactions).where(eq(fixedTransactions.id, fixedTransactionId));
            if (ft) {
              if (ft.type === "transfer" && ft.destinationAccountId) {
                // Insere Saída
                const [outTx] = await tx
                  .insert(transactions)
                  .values({
                    userId: ft.userId,
                    type: ft.type,
                    accountId: ft.accountId,
                    creditCardId: ft.creditCardId,
                    categoryId: ft.categoryId,
                    subcategoryId: ft.subcategoryId,
                    amount: ft.amount,
                    description: `${ft.description} (Saída)`,
                    date: virtualDate,
                    competencyMonth: virtualCompetencyMonth,
                    status: "ignored",
                    fixedTransactionId: ft.id,
                  })
                  .returning();

                // Insere Entrada
                await tx.insert(transactions).values({
                  userId: ft.userId,
                  type: ft.type,
                  accountId: ft.destinationAccountId,
                  creditCardId: null,
                  categoryId: ft.categoryId,
                  subcategoryId: ft.subcategoryId,
                  amount: ft.amount,
                  description: `${ft.description} (Entrada)`,
                  date: virtualDate,
                  competencyMonth: virtualCompetencyMonth,
                  status: "ignored",
                  fixedTransactionId: ft.id,
                  parentTransactionId: outTx.id,
                });
              } else {
                await tx.insert(transactions).values({
                  userId: ft.userId,
                  type: ft.type,
                  accountId: ft.accountId,
                  creditCardId: ft.creditCardId,
                  categoryId: ft.categoryId,
                  subcategoryId: ft.subcategoryId,
                  amount: ft.amount,
                  description: ft.description,
                  date: virtualDate,
                  competencyMonth: virtualCompetencyMonth,
                  status: "ignored",
                  fixedTransactionId: ft.id,
                });
              }
              return { success: true };
            }
            return { success: false, error: "Transação fixa não encontrada." };
          }
        }
        return { success: true };
      }

      const targetFixedId = transactionItem.fixedTransactionId || fixedTransactionId;
      if (targetFixedId) {
        if (mode === "future") {
          await tx.update(fixedTransactions).set({ active: false }).where(eq(fixedTransactions.id, targetFixedId));
          await tx
            .delete(transactions)
            .where(and(eq(transactions.fixedTransactionId, targetFixedId), eq(transactions.status, "pending")));
          return { success: true };
        } else if (isFixedVirtual) {
          return { success: false, error: "Não é possível excluir um único mês de uma projeção sem antes efetivá-la." };
        }
      }

      if (mode === "future") {
        const parentId =
          transactionItem.installmentParentId || transactionItem.parentTransactionId || transactionItem.id;
        const targetDate = transactionItem.date;

        const conditions = [
          eq(transactions.installmentParentId, parentId),
          eq(transactions.parentTransactionId, parentId),
          eq(transactions.id, parentId),
        ];

        const txsToDelete = await tx
          .select()
          .from(transactions)
          .where(and(or(...conditions), gte(transactions.date, targetDate), eq(transactions.userId, userId)));

        // Sort descending by ID to avoid foreign key constraints (children deleted before parents)
        txsToDelete.sort((a, b) => b.id - a.id);

        const idsToDelete = txsToDelete.map((t) => t.id);
        for (const targetId of idsToDelete) {
          const linkedDests = await tx
            .select()
            .from(transactions)
            .where(eq(transactions.parentTransactionId, targetId));
          for (const ld of linkedDests) {
            await applyBalanceDelta(
              tx,
              ld.accountId,
              ld.amount,
              ld.type,
              ld.status || "pending",
              ld.parentTransactionId,
              true,
            );
            await tx.delete(transactions).where(eq(transactions.id, ld.id));
          }
          const [originItem] = await tx.select().from(transactions).where(eq(transactions.id, targetId));
          if (originItem) {
            await applyBalanceDelta(
              tx,
              originItem.accountId,
              originItem.amount,
              originItem.type,
              originItem.status || "pending",
              originItem.parentTransactionId,
              true,
            );
          }
          await tx.delete(transactions).where(eq(transactions.id, targetId));
        }
      } else {
        if (transactionItem.type === "transfer") {
          const otherTx = transactionItem.parentTransactionId
            ? await tx.query.transactions.findFirst({
                where: and(eq(transactions.id, transactionItem.parentTransactionId), eq(transactions.userId, userId)),
              })
            : await tx.query.transactions.findFirst({
                where: and(eq(transactions.parentTransactionId, transactionItem.id), eq(transactions.userId, userId)),
              });

          if (otherTx) {
            const isChild = !!transactionItem.parentTransactionId;
            if (isChild) {
              await applyBalanceDelta(
                tx,
                transactionItem.accountId,
                transactionItem.amount,
                transactionItem.type,
                transactionItem.status || "pending",
                transactionItem.parentTransactionId,
                true,
              );
              await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
              await applyBalanceDelta(
                tx,
                otherTx.accountId,
                otherTx.amount,
                otherTx.type,
                otherTx.status || "pending",
                otherTx.parentTransactionId,
                true,
              );
              await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
            } else {
              await applyBalanceDelta(
                tx,
                otherTx.accountId,
                otherTx.amount,
                otherTx.type,
                otherTx.status || "pending",
                otherTx.parentTransactionId,
                true,
              );
              await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
              await applyBalanceDelta(
                tx,
                transactionItem.accountId,
                transactionItem.amount,
                transactionItem.type,
                transactionItem.status || "pending",
                transactionItem.parentTransactionId,
                true,
              );
              await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
            }
          } else {
            await applyBalanceDelta(
              tx,
              transactionItem.accountId,
              transactionItem.amount,
              transactionItem.type,
              transactionItem.status || "pending",
              transactionItem.parentTransactionId,
              true,
            );
            await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
          }
        } else {
          await applyBalanceDelta(
            tx,
            transactionItem.accountId,
            transactionItem.amount,
            transactionItem.type,
            transactionItem.status || "pending",
            transactionItem.parentTransactionId,
            true,
          );
          await tx.delete(transactions).where(eq(transactions.id, id));
        }
      }

      return { success: true };
    });

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return result;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}

export async function updateTransaction(
  id: number,
  inputData: Partial<CreateTransactionInput> & { destinationAccountId?: number; updateFuture?: boolean },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
    const closingDay = appSettings?.closingDay || 25;

    const result = await db.transaction(async (tx) => {
      const [oldTx] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
      if (!oldTx) {
        if (id < 0) {
          throw new Error(
            "Não é possível editar uma transação virtual futura. Confirme-a (marque como paga) primeiro para poder editá-la.",
          );
        }
        throw new Error("Transação não encontrada");
      }

      const type = inputData.type || oldTx.type;

      if (type === "credit_card_expense") {
        if (inputData.competencyMonth) {
          inputData.invoiceMonth = inputData.competencyMonth;
        }
      } else {
        inputData.invoiceMonth = null;
        if (inputData.date) {
          const parsedDate = parseISO(inputData.date);
          inputData.competencyMonth = getCompetencyMonth(parsedDate, closingDay);
        }
      }

      const { destinationAccountId, updateFuture, ...data } = inputData;

      if (oldTx.type === "transfer") {
        const isDestinationTx = !!oldTx.parentTransactionId;
        const otherTx = isDestinationTx
          ? await tx.query.transactions.findFirst({
              where: and(eq(transactions.id, oldTx.parentTransactionId!), eq(transactions.userId, userId)),
            })
          : await tx.query.transactions.findFirst({
              where: and(eq(transactions.parentTransactionId, oldTx.id), eq(transactions.userId, userId)),
            });

        const originAccountId = data.accountId;
        const destAccountId = destinationAccountId;
        delete data.accountId; // Handle accountId separately

        // Revert old deltas
        const originOld = isDestinationTx ? otherTx : oldTx;
        const destOld = isDestinationTx ? oldTx : otherTx;
        if (originOld) {
          await applyBalanceDelta(
            tx,
            originOld.accountId,
            originOld.amount,
            originOld.type,
            originOld.status || "pending",
            originOld.parentTransactionId,
            true,
          );
        }
        if (destOld) {
          await applyBalanceDelta(
            tx,
            destOld.accountId,
            destOld.amount,
            destOld.type,
            destOld.status || "pending",
            destOld.parentTransactionId,
            true,
          );
        }

        // Update origin
        const originId = isDestinationTx ? otherTx?.id : id;
        if (originId) {
          const originDesc = data.description
            ? `${data.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, "")} (Saída)`
            : undefined;
          const [updatedOrigin] = await tx
            .update(transactions)
            .set({ ...data, accountId: originAccountId, description: originDesc || data.description })
            .where(eq(transactions.id, originId))
            .returning();
          await applyBalanceDelta(
            tx,
            updatedOrigin.accountId,
            updatedOrigin.amount,
            updatedOrigin.type,
            updatedOrigin.status || "pending",
            updatedOrigin.parentTransactionId,
            false,
          );
        }

        // Update destination
        const destId = isDestinationTx ? id : otherTx?.id;
        if (destId) {
          const destDesc = data.description
            ? `${data.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, "")} (Entrada)`
            : undefined;
          const [updatedDest] = await tx
            .update(transactions)
            .set({ ...data, accountId: destAccountId, description: destDesc || data.description })
            .where(eq(transactions.id, destId))
            .returning();
          await applyBalanceDelta(
            tx,
            updatedDest.accountId,
            updatedDest.amount,
            updatedDest.type,
            updatedDest.status || "pending",
            updatedDest.parentTransactionId,
            false,
          );
        }
      } else {
        await applyBalanceDelta(
          tx,
          oldTx.accountId,
          oldTx.amount,
          oldTx.type,
          oldTx.status || "pending",
          oldTx.parentTransactionId,
          true,
        );
        const [updatedTx] = await tx.update(transactions).set(data).where(eq(transactions.id, id)).returning();
        await applyBalanceDelta(
          tx,
          updatedTx.accountId,
          updatedTx.amount,
          updatedTx.type,
          updatedTx.status || "pending",
          updatedTx.parentTransactionId,
          false,
        );
      }

      if (updateFuture && (oldTx.fixedTransactionId || oldTx.installmentTotal)) {
        const parentId = oldTx.installmentParentId || oldTx.parentTransactionId || oldTx.id;
        const targetDate = oldTx.date;

        const conditions = [
          eq(transactions.installmentParentId, parentId),
          eq(transactions.parentTransactionId, parentId),
          eq(transactions.id, parentId),
        ];

        if (oldTx.fixedTransactionId) {
          conditions.push(eq(transactions.fixedTransactionId, oldTx.fixedTransactionId));
        }

        const allRelated = await tx
          .select()
          .from(transactions)
          .where(and(or(...conditions), gte(transactions.date, targetDate), eq(transactions.userId, userId)));

        const updatedIds = [oldTx.id];
        if (oldTx.type === "transfer" && oldTx.parentTransactionId) {
          updatedIds.push(oldTx.parentTransactionId);
        } else if (oldTx.type === "transfer") {
          const child = allRelated.find((t) => t.parentTransactionId === oldTx.id);
          if (child) updatedIds.push(child.id);
        }

        const futuresToUpdate = allRelated.filter((t) => !updatedIds.includes(t.id));

        for (const targetTx of futuresToUpdate) {
          await applyBalanceDelta(
            tx,
            targetTx.accountId,
            targetTx.amount,
            targetTx.type,
            targetTx.status || "pending",
            targetTx.parentTransactionId,
            true,
          );

          const [updatedTx] = await tx
            .update(transactions)
            .set({
              amount: data.amount !== undefined ? data.amount : targetTx.amount,
            })
            .where(eq(transactions.id, targetTx.id))
            .returning();

          await applyBalanceDelta(
            tx,
            updatedTx.accountId,
            updatedTx.amount,
            updatedTx.type,
            updatedTx.status || "pending",
            updatedTx.parentTransactionId,
            false,
          );
        }

        if (oldTx.fixedTransactionId && data.amount !== undefined) {
          await tx
            .update(fixedTransactions)
            .set({
              amount: data.amount,
            })
            .where(eq(fixedTransactions.id, oldTx.fixedTransactionId));
        }
      }

      return { success: true };
    });

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return result;
  } catch (error: unknown) {
    console.error("Error updating transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update transaction";
    return { success: false, error: errorMessage };
  }
}

export async function getTransactionDetailsForEdit(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!tx) return null;

  let destinationAccountId: number | null = null;
  if (tx.type === "transfer") {
    const otherTx = tx.parentTransactionId
      ? await db.query.transactions.findFirst({
          where: and(eq(transactions.id, tx.parentTransactionId), eq(transactions.userId, userId)),
        })
      : await db.query.transactions.findFirst({
          where: and(eq(transactions.parentTransactionId, tx.id), eq(transactions.userId, userId)),
        });

    if (tx.parentTransactionId) {
      destinationAccountId = tx.accountId;
      return { ...tx, accountId: otherTx?.accountId ?? null, destinationAccountId };
    } else {
      destinationAccountId = otherTx?.accountId ?? null;
      return { ...tx, destinationAccountId };
    }
  }

  return tx;
}

export async function fixAllCompetencies() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allTxs = await db.select().from(transactions).where(eq(transactions.userId, userId));
  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const { calculateCreditCardDueDate } = await import("@/lib/utils/competency");

  let updatedCount = 0;

  for (const tx of allTxs) {
    const parsedDate = parseISO(tx.date);
    let correctCompetency: string;

    if (tx.type === "credit_card_expense" && tx.creditCardId) {
      const card = cardMap.get(tx.creditCardId);
      if (!card) continue;
      const dueDate = calculateCreditCardDueDate(parsedDate, card.closingDay, card.dueDay);
      correctCompetency = format(dueDate, "yyyy-MM");
    } else {
      correctCompetency = getCompetencyMonth(parsedDate, closingDay);
    }

    if (tx.competencyMonth !== correctCompetency) {
      await db.update(transactions).set({ competencyMonth: correctCompetency }).where(eq(transactions.id, tx.id));
      updatedCount++;
    }
  }

  return { success: true, count: updatedCount };
}

export async function backfillInvoiceMonths() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const txsToUpdate = await db.query.transactions.findMany({
    where: and(
      eq(transactions.type, "credit_card_expense"),
      isNull(transactions.invoiceMonth),
      eq(transactions.userId, userId),
    ),
  });

  if (txsToUpdate.length === 0) {
    return { success: true, count: 0 };
  }

  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const { calculateCreditCardDueDate } = await import("@/lib/utils/competency");

  let updatedCount = 0;

  for (const tx of txsToUpdate) {
    let newInvoiceMonth = tx.competencyMonth;

    if (!newInvoiceMonth && tx.creditCardId) {
      const card = cardMap.get(tx.creditCardId);
      if (card) {
        const dueDate = calculateCreditCardDueDate(parseISO(tx.date), card.closingDay, card.dueDay);
        newInvoiceMonth = format(dueDate, "yyyy-MM");
      }
    }

    if (newInvoiceMonth) {
      await db.update(transactions).set({ invoiceMonth: newInvoiceMonth }).where(eq(transactions.id, tx.id));
      updatedCount++;
    }
  }

  return { success: true, count: updatedCount };
}
