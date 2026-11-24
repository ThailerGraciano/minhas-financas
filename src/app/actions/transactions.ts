"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, creditCards, fixedTransactionOverrides, fixedTransactions, settings, transactions } from "@/db/schema";
import { applyBalanceDelta } from "@/lib/balance-utils";
import {
  buildGlobalCompetencyCondition,
  calculateCreditCardDueDate,
  getCompetencyMonth,
  getTargetInvoiceMonth,
} from "@/lib/competency-utils";
import {
  activeFixedCondition,
  getFixedOverride,
  getFixedOverridesMap,
  getPreviousCompetencyMonth,
  resolveFixedOccurrence,
  upsertFixedOverride,
} from "@/lib/fixed-transactions";
import { addMonths, endOfMonth, format, getDaysInMonth, parseISO, subMonths } from "date-fns";
import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type NewTransaction = typeof transactions.$inferInsert;
type CreateTransactionInput = Omit<NewTransaction, "userId" | "dueDate" | "launchDate" | "categoryId"> & {
  categoryId?: number;
  dueDate?: string;
  launchDate?: string;
  date?: string;
  destinationAccountId?: number;
  isFixed?: boolean;
  isTotalAmount?: boolean;
  current_installment?: number;
};

type DBTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const transactionSchema = z
  .object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.string().refine((val) => Number(val) > 0, "Valor deve ser maior que zero"),
    dueDate: z.string().optional(),
    launchDate: z.string().optional(),
    date: z.string().optional(),
    competencyMonth: z.string().optional(),
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
    if (!data.dueDate && !data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data é obrigatória",
        path: ["dueDate"],
      });
    }
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

export async function getTransactions(
  month?: string,
  accountId?: number,
  dateMode: "due_date" | "launch_date" = "due_date",
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), "yyyy-MM");

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const userCards = await db.query.creditCards.findMany({
    where: eq(creditCards.userId, userId),

    columns: { id: true, dueDay: true, closingDay: true },
  });

  const condition = buildGlobalCompetencyCondition(currentMonth, closingDay, userId, userCards, dateMode);
  let finalCondition = condition;
  if (accountId) {
    finalCondition = and(condition, eq(transactions.accountId, accountId)) as typeof condition;
  }

  const realTransactions = await db.query.transactions.findMany({
    where: finalCondition,
    with: {
      account: true,
      category: true,
      subcategory: true,
      creditCard: true,
    },
    // Forced recompile to clear Next.js cache
    orderBy: (t, { desc }) => [dateMode === "launch_date" ? desc(t.launchDate) : desc(t.dueDate)],
  });

  const monthDate = parseISO(`${currentMonth}-01`);
  const lastDayOfMonth = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const fixedCondition = and(
    activeFixedCondition(userId, currentMonth),
    lte(fixedTransactions.startDate, lastDayOfMonth),
  );

  const activeFixedTxs = await db.query.fixedTransactions.findMany({
    where: fixedCondition,
    with: {
      account: true,
      category: true,
      subcategory: true,
      creditCard: true,
      destinationAccount: true,
    },
  });

  const materializedFixedIds = new Set(
    realTransactions.filter((t) => t.fixedTransactionId).map((t) => t.fixedTransactionId),
  );

  const overridesMap = await getFixedOverridesMap(
    userId,
    activeFixedTxs.map((ft) => ft.id),
    [currentMonth],
  );

  const virtualTransactions = activeFixedTxs
    .filter((ft) => !materializedFixedIds.has(ft.id))
    .flatMap((ft) => {
      const override = getFixedOverride(overridesMap, ft.id, currentMonth);
      const resolved = resolveFixedOccurrence(ft, override);
      if (!resolved) return [];
      if (accountId && resolved.accountId !== accountId) return [];

      const dayStr = ft.startDate.split("-")[2];
      const dayNum = parseInt(dayStr, 10);

      let targetMonthDate = new Date(monthDate);
      let closingDayToUse = closingDay;
      let targetInvoiceMonth = resolved.type === "credit_card_expense" ? currentMonth : null;

      const resolvedCard = override?.creditCard ?? ft.creditCard;
      if (resolved.type === "credit_card_expense" && resolvedCard) {
        targetInvoiceMonth = getTargetInvoiceMonth(currentMonth, closingDay, resolvedCard.dueDay);
        targetMonthDate = parseISO(`${targetInvoiceMonth}-01`);
        closingDayToUse = resolvedCard.closingDay;
      }

      if (dayNum > closingDayToUse) {
        targetMonthDate = subMonths(targetMonthDate, 1);
      }

      const targetDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), dayNum);
      const finalDate = targetDate.getMonth() !== targetMonthDate.getMonth() ? endOfMonth(targetMonthDate) : targetDate;
      const defaultDateStr = format(finalDate, "yyyy-MM-dd");

      if (defaultDateStr < ft.startDate) return [];

      const dueDateStr = resolved.overrideDueDate || defaultDateStr;
      const launchDateStr = resolved.overrideLaunchDate || dueDateStr;

      const tempId = -Math.floor(Math.random() * 1000000) - 1;
      const resolvedAccount = override?.account ?? ft.account;
      const resolvedCategory = override?.category ?? ft.category;
      const resolvedSubcategory =
        override && override.subcategoryId !== undefined ? override.subcategory : ft.subcategory;
      const resolvedDestAccount = override?.destinationAccount ?? ft.destinationAccount;

      const origin: (typeof realTransactions)[0] = {
        id: tempId,
        userId: userId,
        type: resolved.type,
        accountId: resolved.accountId,
        creditCardId: resolved.creditCardId,
        categoryId: resolved.categoryId,
        subcategoryId: resolved.subcategoryId,
        amount: resolved.amount,
        description: resolved.type === "transfer" ? `${resolved.description} (Saída)` : resolved.description,
        dueDate: dueDateStr,
        launchDate: launchDateStr,
        competencyMonth: currentMonth,
        invoiceMonth: targetInvoiceMonth,
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
        loanId: null,
        account: resolvedAccount,
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        creditCard: resolvedCard,
      };

      if (resolved.type === "transfer" && resolved.destinationAccountId) {
        const dest: (typeof realTransactions)[0] = {
          ...origin,
          id: tempId - 1,
          accountId: resolved.destinationAccountId,
          description: `${resolved.description} (Entrada)`,
          parentTransactionId: origin.id,
          account: resolvedDestAccount,
        };
        return [origin, dest];
      }

      return [origin];
    });

  const allTransactions = [...realTransactions, ...virtualTransactions].filter((t) => t.status !== "ignored");

  allTransactions.sort((a, b) => {
    const dateA = dateMode === "launch_date" ? a.launchDate : a.dueDate;
    const dateB = dateMode === "launch_date" ? b.launchDate : b.dueDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

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

  const rawDueDate = data.dueDate || data.date || format(new Date(), "yyyy-MM-dd");
  const rawLaunchDate = data.launchDate || rawDueDate;

  let finalDueDate = rawDueDate;
  const finalLaunchDate = rawLaunchDate;

  if (data.type === "credit_card_expense" && data.creditCardId) {
    const card = await db.query.creditCards.findFirst({
      where: eq(creditCards.id, data.creditCardId),
    });
    if (card) {
      const calculatedDueDate = calculateCreditCardDueDate(parseISO(finalLaunchDate), card.closingDay, card.dueDay);
      finalDueDate = format(calculatedDueDate, "yyyy-MM-dd");
      if (!data.invoiceMonth) {
        data.invoiceMonth = format(calculatedDueDate, "yyyy-MM");
      }
    }
  }

  const parsedDueDate = parseISO(finalDueDate);

  if (data.type === "credit_card_expense") {
    if (data.invoiceMonth) {
      data.competencyMonth = data.invoiceMonth;
    } else if (!data.competencyMonth) {
      data.competencyMonth = getCompetencyMonth(parsedDueDate, closingDay);
    }
  } else {
    data.invoiceMonth = null;
    data.competencyMonth = getCompetencyMonth(parsedDueDate, closingDay);
  }

  if (subcategoryRequiredTypes.includes(data.type) && (!data.subcategoryId || data.subcategoryId <= 0)) {
    return { success: false, error: "Subcategoria é obrigatória para receitas e despesas" };
  }

  try {
    const { isFixed, destinationAccountId, isTotalAmount, current_installment, date: _date, ...restTxData } = data;
    const txData = {
      ...restTxData,
      categoryId: restTxData.categoryId ?? 0,
      dueDate: finalDueDate,
      launchDate: finalLaunchDate,
    };
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
            startDate: txData.dueDate,
            active: true,
            destinationAccountId: destinationAccountId || null,
          })
          .returning();

        const baseDueDate = parseISO(txData.dueDate);
        const baseLaunchDate = parseISO(txData.launchDate);
        const baseCompetency = parseISO(`${txData.competencyMonth}-01`);

        for (let i = 0; i < 12; i++) {
          const nextDueDate = addMonths(baseDueDate, i);
          const nextLaunchDate = addMonths(baseLaunchDate, i);
          const nextCompetency = addMonths(baseCompetency, i);
          const nextCompetencyStr = format(nextCompetency, "yyyy-MM");
          const invoiceMonthStr = txData.type === "credit_card_expense" ? nextCompetencyStr : null;

          if (isTransfer) {
            const status = i === 0 ? txData.status || "pending" : "pending";
            const [originTx] = await tx
              .insert(transactions)
              .values({
                ...txData,
                userId,
                description: `${txData.description} (Saída)`,
                dueDate: format(nextDueDate, "yyyy-MM-dd"),
                launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
                competencyMonth: nextCompetencyStr,
                invoiceMonth: invoiceMonthStr,
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
              dueDate: format(nextDueDate, "yyyy-MM-dd"),
              launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
              competencyMonth: nextCompetencyStr,
              invoiceMonth: invoiceMonthStr,
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
              dueDate: format(nextDueDate, "yyyy-MM-dd"),
              launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
              competencyMonth: nextCompetencyStr,
              invoiceMonth: invoiceMonthStr,
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

        const baseDueDate = parseISO(txData.dueDate);
        const baseLaunchDate = parseISO(txData.launchDate);
        const baseCompetency = txData.competencyMonth ? parseISO(`${txData.competencyMonth}-01`) : baseDueDate;

        for (let i = currentInstallment + 1; i <= totalInstallments; i++) {
          const nextDueDate = addMonths(baseDueDate, i - currentInstallment);
          const nextLaunchDate = addMonths(baseLaunchDate, i - currentInstallment);
          const nextCompetency = addMonths(baseCompetency, i - currentInstallment);
          const nextCompetencyStr = format(nextCompetency, "yyyy-MM");
          const invoiceMonthStr = txData.type === "credit_card_expense" ? nextCompetencyStr : null;
          const isLast = i === totalInstallments;

          if (isTransfer) {
            const [originTx] = await tx
              .insert(transactions)
              .values({
                ...txData,
                description: `${txData.description} (${i}/${totalInstallments}) (Saída)`,
                userId,
                amount: isLast ? lastParcelAmount : baseParcelAmount,
                dueDate: format(nextDueDate, "yyyy-MM-dd"),
                launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
                competencyMonth: nextCompetencyStr,
                invoiceMonth: invoiceMonthStr,
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
              dueDate: format(nextDueDate, "yyyy-MM-dd"),
              launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
              competencyMonth: nextCompetencyStr,
              invoiceMonth: invoiceMonthStr,
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
              dueDate: format(nextDueDate, "yyyy-MM-dd"),
              launchDate: format(nextLaunchDate, "yyyy-MM-dd"),
              competencyMonth: nextCompetencyStr,
              invoiceMonth: invoiceMonthStr,
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
    const errorMessage = error instanceof Error ? error.message : "Falha ao criar transação";
    return { success: false, error: errorMessage };
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
    const errorMessage = error instanceof Error ? error.message : "Falha ao atualizar status da transação";
    return { success: false, error: errorMessage };
  }
}

export type VirtualTransactionInput = {
  type: string;
  accountId: number | null;
  creditCardId: number | null;
  categoryId: number;
  subcategoryId: number | null;
  amount: string;
  description: string;
  dueDate?: string;
  launchDate?: string;
  date?: string;
  competencyMonth: string;
  invoiceMonth?: string | null;
  fixedTransactionId: string | null;
};

export async function toggleTransactionStatus(
  id: string | number,
  currentStatus: string,
  isFixedVirtual: boolean = false,
  virtualData?: VirtualTransactionInput,
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    if (isFixedVirtual && virtualData) {
      const result = await payVirtualTransaction(virtualData);
      if (!result.success) {
        return { success: false, error: result.error || "Failed to pay virtual transaction" };
      }
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
    const errorMessage = error instanceof Error ? error.message : "Falha ao alternar status da transação";
    return { success: false, error: errorMessage };
  }
}

export async function payVirtualTransaction(txData: VirtualTransactionInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const existingOverride = txData.fixedTransactionId
      ? await db.query.fixedTransactionOverrides.findFirst({
          where: and(
            eq(fixedTransactionOverrides.fixedTransactionId, txData.fixedTransactionId),
            eq(fixedTransactionOverrides.competencyMonth, txData.competencyMonth),
            eq(fixedTransactionOverrides.userId, userId),
          ),
        })
      : undefined;

    const dueDate = existingOverride?.dueDate || txData.dueDate || txData.date || format(new Date(), "yyyy-MM-dd");
    const launchDate = existingOverride?.launchDate || txData.launchDate || dueDate;

    if (txData.type === "transfer" && txData.fixedTransactionId) {
      const ft = await db.query.fixedTransactions.findFirst({
        where: and(eq(fixedTransactions.id, txData.fixedTransactionId), eq(fixedTransactions.userId, userId)),
      });
      const resolvedFt = ft ? resolveFixedOccurrence(ft, existingOverride) : null;
      if (resolvedFt && resolvedFt.destinationAccountId) {
        await db.transaction(async (tx) => {
          const [originTx] = await tx
            .insert(transactions)
            .values({
              userId,
              type: "transfer",
              accountId: resolvedFt.accountId,
              categoryId: resolvedFt.categoryId,
              subcategoryId: resolvedFt.subcategoryId,
              amount: resolvedFt.amount,
              description: `${resolvedFt.description} (Saída)`,
              dueDate,
              launchDate,
              competencyMonth: txData.competencyMonth,
              invoiceMonth: txData.invoiceMonth || null,
              status: "paid",
              paidAt: new Date(),
              fixedTransactionId: resolvedFt.id,
            })
            .returning();

          await applyBalanceDelta(tx, resolvedFt.accountId, resolvedFt.amount, "transfer", "paid", null);

          await tx
            .insert(transactions)
            .values({
              userId,
              type: "transfer",
              accountId: resolvedFt.destinationAccountId,
              categoryId: resolvedFt.categoryId,
              subcategoryId: resolvedFt.subcategoryId,
              amount: resolvedFt.amount,
              description: `${resolvedFt.description} (Entrada)`,
              dueDate,
              launchDate,
              competencyMonth: txData.competencyMonth,
              invoiceMonth: txData.invoiceMonth || null,
              status: "paid",
              paidAt: new Date(),
              fixedTransactionId: resolvedFt.id,
              parentTransactionId: originTx.id,
            });

          await applyBalanceDelta(tx, resolvedFt.destinationAccountId, resolvedFt.amount, "transfer", "paid", originTx.id);
        });
      }
    } else {
      await db.transaction(async (tx) => {
        const finalAccountId = existingOverride?.accountId ?? txData.accountId;
        const finalCreditCardId = existingOverride?.creditCardId ?? txData.creditCardId;
        const finalCategoryId = existingOverride?.categoryId ?? txData.categoryId;
        const finalSubcategoryId =
          existingOverride && existingOverride.subcategoryId !== undefined
            ? existingOverride.subcategoryId
            : txData.subcategoryId && txData.subcategoryId > 0
              ? txData.subcategoryId
              : null;
        const finalAmount = existingOverride?.amount ?? txData.amount;
        const finalDescription = existingOverride?.description ?? txData.description;

        await tx.insert(transactions).values({
          userId,
          type: txData.type,
          accountId: finalAccountId,
          creditCardId: finalCreditCardId,
          categoryId: finalCategoryId,
          subcategoryId: finalSubcategoryId,
          amount: finalAmount,
          description: finalDescription,
          dueDate,
          launchDate,
          competencyMonth: txData.competencyMonth,
          invoiceMonth: txData.invoiceMonth || (txData.type === "credit_card_expense" ? txData.competencyMonth : null),
          status: "paid",
          paidAt: new Date(),
          fixedTransactionId: txData.fixedTransactionId,
        });

        await applyBalanceDelta(tx, finalAccountId, finalAmount, txData.type, "paid", null);
      });
    }

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/planning");
    revalidatePath("/credit-cards");
    return { success: true };
  } catch (error) {
    console.error("Error paying virtual transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Falha ao efetivar transação fixa projetada";
    return { success: false, error: errorMessage };
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
    orderBy: (t, { desc }) => [desc(t.dueDate)],
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
  mode: "single" | "future" | "all" = "single",
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
          if (mode === "all") {
            await tx
              .update(fixedTransactions)
              .set({ active: false })
              .where(and(eq(fixedTransactions.id, fixedTransactionId), eq(fixedTransactions.userId, userId)));
            await tx
              .delete(transactions)
              .where(
                and(
                  eq(transactions.fixedTransactionId, fixedTransactionId),
                  eq(transactions.status, "pending"),
                  eq(transactions.userId, userId),
                ),
              );
            await tx
              .delete(fixedTransactionOverrides)
              .where(
                and(
                  eq(fixedTransactionOverrides.fixedTransactionId, fixedTransactionId),
                  eq(fixedTransactionOverrides.userId, userId),
                ),
              );
            return { success: true };
          } else if (mode === "future" && virtualCompetencyMonth) {
            const prevMonth = getPreviousCompetencyMonth(virtualCompetencyMonth);
            await tx
              .update(fixedTransactions)
              .set({ endMonth: prevMonth })
              .where(and(eq(fixedTransactions.id, fixedTransactionId), eq(fixedTransactions.userId, userId)));
            await tx
              .delete(transactions)
              .where(
                and(
                  eq(transactions.fixedTransactionId, fixedTransactionId),
                  eq(transactions.status, "pending"),
                  eq(transactions.userId, userId),
                  or(
                    gte(transactions.invoiceMonth, virtualCompetencyMonth),
                    and(isNull(transactions.invoiceMonth), gte(transactions.competencyMonth, virtualCompetencyMonth)),
                  ),
                ),
              );
            await tx
              .delete(fixedTransactionOverrides)
              .where(
                and(
                  eq(fixedTransactionOverrides.fixedTransactionId, fixedTransactionId),
                  eq(fixedTransactionOverrides.userId, userId),
                  gte(fixedTransactionOverrides.competencyMonth, virtualCompetencyMonth),
                ),
              );
            return { success: true };
          } else if (mode === "single" && virtualCompetencyMonth) {
            await upsertFixedOverride(tx, {
              userId,
              fixedTransactionId,
              competencyMonth: virtualCompetencyMonth,
              isIgnored: true,
            });
            return { success: true };
          }
        }
        return { success: true };
      }

      const targetFixedId = transactionItem.fixedTransactionId || fixedTransactionId;
      if (targetFixedId) {
        if (mode === "all") {
          await tx
            .update(fixedTransactions)
            .set({ active: false })
            .where(and(eq(fixedTransactions.id, targetFixedId), eq(fixedTransactions.userId, userId)));
          await tx
            .delete(transactions)
            .where(
              and(
                eq(transactions.fixedTransactionId, targetFixedId),
                eq(transactions.status, "pending"),
                eq(transactions.userId, userId),
              ),
            );
          await tx
            .delete(fixedTransactionOverrides)
            .where(
              and(
                eq(fixedTransactionOverrides.fixedTransactionId, targetFixedId),
                eq(fixedTransactionOverrides.userId, userId),
              ),
            );
          return { success: true };
        } else if (mode === "future") {
          const targetMonth =
            virtualCompetencyMonth || transactionItem.invoiceMonth || transactionItem.competencyMonth;
          const prevMonth = getPreviousCompetencyMonth(targetMonth);
          await tx
            .update(fixedTransactions)
            .set({ endMonth: prevMonth })
            .where(and(eq(fixedTransactions.id, targetFixedId), eq(fixedTransactions.userId, userId)));
          await tx
            .delete(transactions)
            .where(
              and(
                eq(transactions.fixedTransactionId, targetFixedId),
                eq(transactions.status, "pending"),
                eq(transactions.userId, userId),
                or(
                  gte(transactions.invoiceMonth, targetMonth),
                  and(isNull(transactions.invoiceMonth), gte(transactions.competencyMonth, targetMonth)),
                ),
              ),
            );
          await tx
            .delete(fixedTransactionOverrides)
            .where(
              and(
                eq(fixedTransactionOverrides.fixedTransactionId, targetFixedId),
                eq(fixedTransactionOverrides.userId, userId),
                gte(fixedTransactionOverrides.competencyMonth, targetMonth),
              ),
            );
          return { success: true };
        } else if (isFixedVirtual) {
          return { success: false, error: "Não é possível excluir um único mês de uma projeção sem antes efetivá-la." };
        }
      }

      if (mode === "future") {
        const parentId =
          transactionItem.installmentParentId || transactionItem.parentTransactionId || transactionItem.id;
        const targetDate = transactionItem.dueDate;

        const conditions = [
          eq(transactions.installmentParentId, parentId),
          eq(transactions.parentTransactionId, parentId),
          eq(transactions.id, parentId),
        ];

        const txsToDelete = await tx
          .select()
          .from(transactions)
          .where(and(or(...conditions), gte(transactions.dueDate, targetDate), eq(transactions.userId, userId)));

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
              if (targetFixedId) {
                await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, transactionItem.id));
              } else {
                await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
              }
              await applyBalanceDelta(
                tx,
                otherTx.accountId,
                otherTx.amount,
                otherTx.type,
                otherTx.status || "pending",
                otherTx.parentTransactionId,
                true,
              );
              if (targetFixedId) {
                await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, otherTx.id));
              } else {
                await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
              }
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
              if (targetFixedId) {
                await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, otherTx.id));
              } else {
                await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
              }
              await applyBalanceDelta(
                tx,
                transactionItem.accountId,
                transactionItem.amount,
                transactionItem.type,
                transactionItem.status || "pending",
                transactionItem.parentTransactionId,
                true,
              );
              if (targetFixedId) {
                await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, transactionItem.id));
              } else {
                await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
              }
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
            if (targetFixedId) {
              await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, transactionItem.id));
            } else {
              await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
            }
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
          if (targetFixedId) {
            await tx.update(transactions).set({ status: "ignored" }).where(eq(transactions.id, id));
          } else {
            await tx.delete(transactions).where(eq(transactions.id, id));
          }
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
    const errorMessage = error instanceof Error ? error.message : "Falha ao excluir transação";
    return { success: false, error: errorMessage };
  }
}

function applyDueDateDay(baseDateStr: string, targetDay: number): string {
  const [yearStr, monthStr] = baseDateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const maxDays = getDaysInMonth(new Date(year, month - 1, 1));
  const day = Math.min(targetDay, maxDays);
  return `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
}

export async function updateTransaction(
  id: number,
  inputData: Partial<CreateTransactionInput> & {
    destinationAccountId?: number;
    updateFuture?: boolean;
    updateFutureDueDateMode?: "day_only" | "exact" | "keep";
    fixedTransactionId?: string | null;
    originalCompetencyMonth?: string | null;
  },
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
        if (id < 0 && inputData.fixedTransactionId && inputData.originalCompetencyMonth) {
          const [ft] = await tx
            .select()
            .from(fixedTransactions)
            .where(and(eq(fixedTransactions.id, inputData.fixedTransactionId), eq(fixedTransactions.userId, userId)));
          if (!ft) {
            throw new Error("Transação fixa não encontrada");
          }

          const targetCompMonth = inputData.originalCompetencyMonth;
          const cleanDescription = inputData.description
            ? inputData.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, "")
            : undefined;
          const targetDueDate = inputData.dueDate || inputData.date;

          if (!inputData.updateFuture) {
            await upsertFixedOverride(tx, {
              userId,
              fixedTransactionId: ft.id,
              competencyMonth: targetCompMonth,
              amount: inputData.amount !== undefined ? String(inputData.amount) : undefined,
              description: cleanDescription,
              dueDate: targetDueDate,
              launchDate: inputData.launchDate || targetDueDate,
              categoryId: inputData.categoryId,
              subcategoryId: inputData.subcategoryId !== undefined ? inputData.subcategoryId : undefined,
              accountId: inputData.accountId !== undefined ? inputData.accountId : undefined,
              creditCardId: inputData.creditCardId !== undefined ? inputData.creditCardId : undefined,
              destinationAccountId:
                inputData.destinationAccountId !== undefined ? inputData.destinationAccountId : undefined,
              isIgnored: false,
            });
            return { success: true };
          } else {
            const updateFixed: Partial<typeof fixedTransactions.$inferInsert> = {};
            if (inputData.amount !== undefined) updateFixed.amount = String(inputData.amount);
            if (cleanDescription !== undefined) updateFixed.description = cleanDescription;
            if (inputData.categoryId !== undefined) updateFixed.categoryId = inputData.categoryId;
            if (inputData.subcategoryId !== undefined) updateFixed.subcategoryId = inputData.subcategoryId;
            if (inputData.accountId !== undefined) updateFixed.accountId = inputData.accountId;
            if (inputData.creditCardId !== undefined) updateFixed.creditCardId = inputData.creditCardId;
            if (inputData.destinationAccountId !== undefined)
              updateFixed.destinationAccountId = inputData.destinationAccountId;

            if (targetDueDate && inputData.updateFutureDueDateMode && inputData.updateFutureDueDateMode !== "keep") {
              if (inputData.updateFutureDueDateMode === "day_only") {
                const targetDay = Number(targetDueDate.split("-")[2]);
                if (!Number.isNaN(targetDay)) {
                  updateFixed.startDate = applyDueDateDay(ft.startDate, targetDay);
                }
              } else if (inputData.updateFutureDueDateMode === "exact") {
                updateFixed.startDate = targetDueDate;
              }
            }

            if (Object.keys(updateFixed).length > 0) {
              await tx
                .update(fixedTransactions)
                .set(updateFixed)
                .where(and(eq(fixedTransactions.id, ft.id), eq(fixedTransactions.userId, userId)));
            }

            await tx
              .delete(fixedTransactionOverrides)
              .where(
                and(
                  eq(fixedTransactionOverrides.fixedTransactionId, ft.id),
                  eq(fixedTransactionOverrides.userId, userId),
                  gte(fixedTransactionOverrides.competencyMonth, targetCompMonth),
                ),
              );

            const updatePending: Partial<typeof transactions.$inferInsert> = {};
            if (inputData.amount !== undefined) updatePending.amount = String(inputData.amount);
            if (cleanDescription !== undefined && ft.type !== "transfer") updatePending.description = cleanDescription;
            if (inputData.categoryId !== undefined) updatePending.categoryId = inputData.categoryId;
            if (inputData.subcategoryId !== undefined) updatePending.subcategoryId = inputData.subcategoryId;
            if (inputData.accountId !== undefined && ft.type !== "transfer")
              updatePending.accountId = inputData.accountId;
            if (inputData.creditCardId !== undefined) updatePending.creditCardId = inputData.creditCardId;

            if (Object.keys(updatePending).length > 0) {
              await tx
                .update(transactions)
                .set(updatePending)
                .where(
                  and(
                    eq(transactions.fixedTransactionId, ft.id),
                    eq(transactions.userId, userId),
                    eq(transactions.status, "pending"),
                    or(
                      gte(transactions.invoiceMonth, targetCompMonth),
                      and(isNull(transactions.invoiceMonth), gte(transactions.competencyMonth, targetCompMonth)),
                    ),
                  ),
                );
            }

            return { success: true };
          }
        }
        if (id < 0) {
          throw new Error(
            "Não é possível editar uma transação virtual futura sem referência da recorrência.",
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
        const candidateDueDate = inputData.dueDate || inputData.date;
        if (candidateDueDate) {
          const parsedDate = parseISO(candidateDueDate);
          inputData.competencyMonth = getCompetencyMonth(parsedDate, closingDay);
        }
      }

      const {
        destinationAccountId,
        updateFuture,
        updateFutureDueDateMode,
        fixedTransactionId: _ignoredFixedId,
        originalCompetencyMonth: _ignoredOrigComp,
        date: legacyDate,
        ...data
      } = inputData;
      if (inputData.dueDate || legacyDate) {
        data.dueDate = inputData.dueDate || legacyDate;
      }
      if (inputData.launchDate) {
        data.launchDate = inputData.launchDate;
      }

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
        const targetDate = oldTx.dueDate;

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
          .where(and(or(...conditions), gte(transactions.dueDate, targetDate), eq(transactions.userId, userId)));

        const updatedIds = [oldTx.id];
        if (oldTx.type === "transfer" && oldTx.parentTransactionId) {
          updatedIds.push(oldTx.parentTransactionId);
        } else if (oldTx.type === "transfer") {
          const child = allRelated.find((t) => t.parentTransactionId === oldTx.id);
          if (child) updatedIds.push(child.id);
        }

        const futuresToUpdate = allRelated.filter((t) => !updatedIds.includes(t.id));

        const userCards = await tx.select().from(creditCards).where(eq(creditCards.userId, userId));
        const cardMap = new Map(userCards.map((c) => [c.id, c]));

        const dueDateChanged = data.dueDate !== undefined && data.dueDate !== oldTx.dueDate;
        const dueDateMode = updateFutureDueDateMode ?? "day_only";
        const targetDueDay = dueDateChanged && data.dueDate ? Number(data.dueDate.split("-")[2]) : null;

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

          const isDestination = targetTx.type === "transfer" && targetTx.parentTransactionId !== null;

          let newAccountId = targetTx.accountId;
          let newCreditCardId = targetTx.creditCardId;
          let newType = targetTx.type;

          if (data.type !== undefined && targetTx.type !== "transfer") {
            newType = data.type;
            newAccountId = data.accountId !== undefined ? data.accountId : null;
            newCreditCardId = data.creditCardId !== undefined ? data.creditCardId : null;
          } else if (targetTx.type === "transfer") {
            if (isDestination && destinationAccountId !== undefined) {
              newAccountId = destinationAccountId;
            } else if (!isDestination && data.accountId !== undefined) {
              newAccountId = data.accountId;
            }
          }

          let newDueDate = targetTx.dueDate;
          if (dueDateChanged && data.dueDate) {
            if (dueDateMode === "day_only" && targetDueDay !== null) {
              newDueDate = applyDueDateDay(targetTx.dueDate, targetDueDay);
            } else if (dueDateMode === "exact") {
              newDueDate = data.dueDate;
            }
          }

          let newInvoiceMonth = targetTx.invoiceMonth;
          let newCompetencyMonth = targetTx.competencyMonth;

          if (newType === "credit_card_expense" && newCreditCardId) {
            const card = cardMap.get(newCreditCardId);
            if (card) {
              newCompetencyMonth = getCompetencyMonth(parseISO(newDueDate), card.closingDay);
              newInvoiceMonth = newCompetencyMonth;
            }
          } else if (newType === "expense" || newType === "income" || newType === "transfer") {
            newInvoiceMonth = null;
            newCompetencyMonth = getCompetencyMonth(parseISO(newDueDate), closingDay);
          }

          let newDescription = targetTx.description;
          if (data.description !== undefined && data.description !== oldTx.description) {
            const cleanBaseDesc = data.description
              .replace(/\s*\(Saída\)|\s*\(Entrada\)/g, "")
              .replace(/\s*\(\d+\/\d+\)/g, "")
              .trim();
            const installmentMatch = targetTx.description.match(/\s*\(\d+\/\d+\)/);
            const installmentSuffix =
              targetTx.installmentCurrent && targetTx.installmentTotal
                ? ` (${targetTx.installmentCurrent}/${targetTx.installmentTotal})`
                : installmentMatch
                  ? installmentMatch[0]
                  : "";
            const descWithInstallment = `${cleanBaseDesc}${installmentSuffix}`;
            if (targetTx.type === "transfer") {
              newDescription = isDestination ? `${descWithInstallment} (Entrada)` : `${descWithInstallment} (Saída)`;
            } else {
              newDescription = descWithInstallment;
            }
          }

          const [updatedTx] = await tx
            .update(transactions)
            .set({
              amount: data.amount !== undefined ? data.amount : targetTx.amount,
              description: newDescription,
              dueDate: newDueDate,
              categoryId: data.categoryId !== undefined ? data.categoryId : targetTx.categoryId,
              subcategoryId: data.subcategoryId !== undefined ? data.subcategoryId : targetTx.subcategoryId,
              accountId: newAccountId,
              creditCardId: newCreditCardId,
              type: newType,
              invoiceMonth: newInvoiceMonth,
              competencyMonth: newCompetencyMonth,
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

        if (oldTx.fixedTransactionId) {
          const updateFixed: Record<string, unknown> = {};
          if (data.amount !== undefined) updateFixed.amount = data.amount;
          if (data.description !== undefined)
            updateFixed.description = data.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, "");
          if (data.categoryId !== undefined) updateFixed.categoryId = data.categoryId;
          if (data.subcategoryId !== undefined) updateFixed.subcategoryId = data.subcategoryId;
          if (data.accountId !== undefined) updateFixed.accountId = data.accountId;
          if (data.creditCardId !== undefined) updateFixed.creditCardId = data.creditCardId;
          if (data.type !== undefined && data.type !== "transfer") updateFixed.type = data.type;
          if (destinationAccountId !== undefined) updateFixed.destinationAccountId = destinationAccountId;
          if (dueDateChanged && data.dueDate && dueDateMode !== "keep") {
            if (dueDateMode === "day_only" && targetDueDay !== null) {
              const [existingFixed] = await tx
                .select({ startDate: fixedTransactions.startDate })
                .from(fixedTransactions)
                .where(eq(fixedTransactions.id, oldTx.fixedTransactionId))
                .limit(1);
              if (existingFixed) {
                updateFixed.startDate = applyDueDateDay(existingFixed.startDate, targetDueDay);
              }
            } else if (dueDateMode === "exact") {
              updateFixed.startDate = data.dueDate;
            }
          }

          if (Object.keys(updateFixed).length > 0) {
            await tx
              .update(fixedTransactions)
              .set(updateFixed)
              .where(eq(fixedTransactions.id, oldTx.fixedTransactionId));
          }
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

  let updatedCount = 0;

  await db.transaction(async (tx) => {
    for (const item of allTxs) {
      const purchaseDate = parseISO(item.launchDate || item.dueDate);
      const dueDateParsed = parseISO(item.dueDate);
      let correctCompetency: string;

      if (item.type === "credit_card_expense" && item.creditCardId) {
        const card = cardMap.get(item.creditCardId);
        if (!card) continue;
        const dueDate = calculateCreditCardDueDate(purchaseDate, card.closingDay, card.dueDay);
        correctCompetency = format(dueDate, "yyyy-MM");
      } else {
        correctCompetency = getCompetencyMonth(dueDateParsed, closingDay);
      }

      if (item.competencyMonth !== correctCompetency) {
        await tx
          .update(transactions)
          .set({ competencyMonth: correctCompetency })
          .where(and(eq(transactions.id, item.id), eq(transactions.userId, userId)));
        updatedCount++;
      }
    }
  });

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

  let updatedCount = 0;

  await db.transaction(async (tx) => {
    for (const item of txsToUpdate) {
      let newInvoiceMonth = item.competencyMonth;

      if (!newInvoiceMonth && item.creditCardId) {
        const card = cardMap.get(item.creditCardId);
        if (card) {
          const dueDate = calculateCreditCardDueDate(parseISO(item.launchDate || item.dueDate), card.closingDay, card.dueDay);
          newInvoiceMonth = format(dueDate, "yyyy-MM");
        }
      }

      if (newInvoiceMonth) {
        await tx
          .update(transactions)
          .set({ invoiceMonth: newInvoiceMonth })
          .where(and(eq(transactions.id, item.id), eq(transactions.userId, userId)));
        updatedCount++;
      }
    }
  });

  return { success: true, count: updatedCount };
}

export type TransactionInstallmentItem = {
  id: number;
  installmentCurrent: number;
  installmentTotal: number;
  description: string;
  amount: string;
  dueDate: string;
  launchDate: string;
  competencyMonth: string;
  invoiceMonth: string | null;
  status: string;
  paidAt: Date | null;
  isVirtual: boolean;
};

export type TransactionFullDetails = {
  id: number;
  type: string;
  description: string;
  amount: string;
  dueDate: string;
  launchDate: string;
  competencyMonth: string;
  invoiceMonth: string | null;
  status: string;
  paidAt: Date | null;
  observations: string | null;
  isFixed: boolean;
  fixedTransactionId: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  parentTransactionId: number | null;
  installmentParentId: number | null;
  accountId: number | null;
  creditCardId: number | null;
  categoryId: number;
  subcategoryId: number | null;
  account: { id: number; name: string; type: string } | null;
  destinationAccount: { id: number; name: string; type: string } | null;
  originAccount: { id: number; name: string; type: string } | null;
  creditCard: { id: number; name: string; closingDay: number; dueDay: number; creditLimit: string } | null;
  category: { id: number; name: string; icon: string; type: string } | null;
  subcategory: { id: number; name: string } | null;
  fixedTransaction: { id: string; startDate: string; active: boolean } | null;
  loan: { id: string; name: string; type: string; installments: number } | null;
  installments: TransactionInstallmentItem[];
};

function cleanBaseInstallmentDescription(desc: string): string {
  return desc
    .replace(/\s*\(\d+\/\d+\)/g, "")
    .replace(/\s*\((Saída|Entrada)\)/gi, "")
    .trim()
    .toLowerCase();
}

export async function getTransactionFullDetails(id: number): Promise<TransactionFullDetails | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (id < 0) {
    return null;
  }

  const tx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    with: {
      account: true,
      creditCard: true,
      category: true,
      subcategory: true,
      fixedTransaction: true,
      loan: true,
    },
  });

  if (!tx) return null;

  let originAccount: { id: number; name: string; type: string } | null = null;
  let destinationAccount: { id: number; name: string; type: string } | null = null;

  if (tx.type === "transfer") {
    const otherTx = tx.parentTransactionId
      ? await db.query.transactions.findFirst({
          where: and(eq(transactions.id, tx.parentTransactionId), eq(transactions.userId, userId)),
          with: { account: true },
        })
      : await db.query.transactions.findFirst({
          where: and(eq(transactions.parentTransactionId, tx.id), eq(transactions.userId, userId)),
          with: { account: true },
        });

    if (tx.parentTransactionId) {
      originAccount = otherTx?.account
        ? { id: otherTx.account.id, name: otherTx.account.name, type: otherTx.account.type }
        : null;
      destinationAccount = tx.account
        ? { id: tx.account.id, name: tx.account.name, type: tx.account.type }
        : null;
    } else {
      originAccount = tx.account ? { id: tx.account.id, name: tx.account.name, type: tx.account.type } : null;
      destinationAccount = otherTx?.account
        ? { id: otherTx.account.id, name: otherTx.account.name, type: otherTx.account.type }
        : null;
    }
  }

  const descMatch = tx.description.match(/\((\d+)\/(\d+)\)/);
  const inferredCurrent = tx.installmentCurrent ?? (descMatch ? parseInt(descMatch[1], 10) : null);
  const inferredTotal = tx.installmentTotal ?? (descMatch ? parseInt(descMatch[2], 10) : null);

  const isParcelada = Boolean((inferredTotal && inferredTotal > 1) || tx.installmentParentId);
  const installmentsList: TransactionInstallmentItem[] = [];

  if (isParcelada) {
    const rootId =
      tx.installmentParentId || (tx.type !== "transfer" && tx.parentTransactionId ? tx.parentTransactionId : tx.id);

    const linkedConditions = [eq(transactions.id, rootId), eq(transactions.installmentParentId, rootId)];
    if (tx.type !== "transfer") {
      linkedConditions.push(eq(transactions.parentTransactionId, rootId));
    }

    let rawInstallments = await db.query.transactions.findMany({
      where: and(eq(transactions.userId, userId), ne(transactions.status, "ignored"), or(...linkedConditions)),
    });

    if (rawInstallments.length <= 1) {
      const targetBaseDesc = cleanBaseInstallmentDescription(tx.description);
      const fallbackCandidates = await db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, userId),
          ne(transactions.status, "ignored"),
          eq(transactions.type, tx.type),
          tx.creditCardId ? eq(transactions.creditCardId, tx.creditCardId) : isNull(transactions.creditCardId),
          tx.accountId ? eq(transactions.accountId, tx.accountId) : isNull(transactions.accountId),
        ),
      });

      const matchedByDesc = fallbackCandidates.filter((cand) => {
        const candMatch = cand.description.match(/\((\d+)\/(\d+)\)/);
        const candTotal = cand.installmentTotal ?? (candMatch ? parseInt(candMatch[2], 10) : null);
        if (inferredTotal && candTotal !== inferredTotal) return false;
        return cleanBaseDescCompare(cand.description, targetBaseDesc);
      });

      if (matchedByDesc.length > rawInstallments.length) {
        rawInstallments = matchedByDesc;
      }
    }

    rawInstallments.sort((a, b) => {
      const aMatch = a.description.match(/\((\d+)\/(\d+)\)/);
      const bMatch = b.description.match(/\((\d+)\/(\d+)\)/);
      const aNum = a.installmentCurrent ?? (aMatch ? parseInt(aMatch[1], 10) : 0);
      const bNum = b.installmentCurrent ?? (bMatch ? parseInt(bMatch[1], 10) : 0);
      if (aNum !== bNum && aNum > 0 && bNum > 0) return aNum - bNum;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const maxFromDb = rawInstallments.reduce((max, item) => {
      const m = item.description.match(/\((\d+)\/(\d+)\)/);
      const tot = item.installmentTotal ?? (m ? parseInt(m[2], 10) : 0);
      return Math.max(max, tot);
    }, 0);

    const totalInstallments = Math.max(inferredTotal ?? 0, maxFromDb, rawInstallments.length);
    const byNumber = new Map<number, (typeof rawInstallments)[0]>();

    rawInstallments.forEach((item, index) => {
      const m = item.description.match(/\((\d+)\/(\d+)\)/);
      const num = item.installmentCurrent ?? (m ? parseInt(m[1], 10) : index + 1);
      if (!byNumber.has(num) || item.id === tx.id) {
        byNumber.set(num, item);
      }
    });

    const currentParcelNumber =
      inferredCurrent ??
      Array.from(byNumber.entries()).find(([, val]) => val.id === tx.id)?.[0] ??
      1;

    const cleanTitle = tx.description.replace(/\s*\(\d+\/\d+\)/g, "").trim();
    const refDueDate = parseISO(tx.dueDate);
    const refLaunchDate = parseISO(tx.launchDate || tx.dueDate);
    const refCompetencyDate = tx.competencyMonth ? parseISO(`${tx.competencyMonth}-01`) : refDueDate;

    for (let i = 1; i <= totalInstallments; i++) {
      const existing = byNumber.get(i);
      if (existing) {
        installmentsList.push({
          id: existing.id,
          installmentCurrent: i,
          installmentTotal: totalInstallments,
          description: existing.description,
          amount: existing.amount,
          dueDate: existing.dueDate,
          launchDate: existing.launchDate,
          competencyMonth: existing.competencyMonth,
          invoiceMonth: existing.invoiceMonth,
          status: existing.status,
          paidAt: existing.paidAt,
          isVirtual: false,
        });
      } else {
        const diffMonths = i - currentParcelNumber;
        const synthDueDate = format(addMonths(refDueDate, diffMonths), "yyyy-MM-dd");
        const synthLaunchDate = format(addMonths(refLaunchDate, diffMonths), "yyyy-MM-dd");
        const synthCompMonth = format(addMonths(refCompetencyDate, diffMonths), "yyyy-MM");
        const isPastParcel = i < currentParcelNumber;

        installmentsList.push({
          id: -i,
          installmentCurrent: i,
          installmentTotal: totalInstallments,
          description: `${cleanTitle} (${i}/${totalInstallments})`,
          amount: tx.amount,
          dueDate: synthDueDate,
          launchDate: synthLaunchDate,
          competencyMonth: synthCompMonth,
          invoiceMonth: tx.type === "credit_card_expense" ? synthCompMonth : null,
          status: isPastParcel ? "paid" : "pending",
          paidAt: null,
          isVirtual: true,
        });
      }
    }
  }

  return {
    id: tx.id,
    type: tx.type,
    description: tx.description,
    amount: tx.amount,
    dueDate: tx.dueDate,
    launchDate: tx.launchDate,
    competencyMonth: tx.competencyMonth,
    invoiceMonth: tx.invoiceMonth,
    status: tx.status,
    paidAt: tx.paidAt,
    observations: tx.observations,
    isFixed: tx.isFixed || Boolean(tx.fixedTransactionId),
    fixedTransactionId: tx.fixedTransactionId,
    installmentCurrent: inferredCurrent,
    installmentTotal: inferredTotal,
    parentTransactionId: tx.parentTransactionId,
    installmentParentId: tx.installmentParentId,
    accountId: tx.accountId,
    creditCardId: tx.creditCardId,
    categoryId: tx.categoryId,
    subcategoryId: tx.subcategoryId,
    account: tx.account ? { id: tx.account.id, name: tx.account.name, type: tx.account.type } : null,
    destinationAccount,
    originAccount,
    creditCard: tx.creditCard
      ? {
          id: tx.creditCard.id,
          name: tx.creditCard.name,
          closingDay: tx.creditCard.closingDay,
          dueDay: tx.creditCard.dueDay,
          creditLimit: tx.creditCard.creditLimit,
        }
      : null,
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, icon: tx.category.icon, type: tx.category.type }
      : null,
    subcategory: tx.subcategory ? { id: tx.subcategory.id, name: tx.subcategory.name } : null,
    fixedTransaction: tx.fixedTransaction
      ? {
          id: tx.fixedTransaction.id,
          startDate: tx.fixedTransaction.startDate,
          active: tx.fixedTransaction.active,
        }
      : null,
    loan: tx.loan
      ? {
          id: tx.loan.id,
          name: tx.loan.name,
          type: tx.loan.type,
          installments: tx.loan.installments,
        }
      : null,
    installments: installmentsList,
  };
}

function cleanBaseDescCompare(candidateDesc: string, targetBaseDesc: string): boolean {
  if (!targetBaseDesc) return false;
  return cleanBaseInstallmentDescription(candidateDesc) === targetBaseDesc;
}

export async function getRecentRegisteredTransactions(limit: number = 40) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const recentRows = await db.query.transactions.findMany({
    where: (t, { eq, and, ne }) => and(eq(t.userId, userId), ne(t.status, "ignored")),
    with: {
      account: true,
      category: true,
      subcategory: true,
      creditCard: true,
    },
    orderBy: (t, { desc }) => [desc(t.id)],
    limit: limit * 4,
  });

  const byId = new Map<number, (typeof recentRows)[0]>();
  for (const row of recentRows) {
    byId.set(row.id, row);
  }

  // Identify paired transfer destinations when origin is in the batch
  const transferDestByOriginId = new Map<number, (typeof recentRows)[0]>();
  const skipIds = new Set<number>();

  for (const row of recentRows) {
    if (row.type === "transfer" && row.parentTransactionId && byId.has(row.parentTransactionId)) {
      transferDestByOriginId.set(row.parentTransactionId, row);
      skipIds.add(row.id);
    }
  }

  // Group fixed and installment batches that were registered together so the list shows the earliest parcel/occurrence
  // while still sorting by the batch creation ID (highest or parent ID)
  const seenFixedBatch = new Set<string>();
  const seenInstallmentBatch = new Set<number>();

  // Pre-collect earliest parcel for installment batches and fixed batches present in recentRows
  const earliestByFixedId = new Map<string, { tx: (typeof recentRows)[0]; count: number; maxId: number }>();
  const earliestByInstallmentParentId = new Map<number, { tx: (typeof recentRows)[0]; count: number; maxId: number }>();

  for (const row of recentRows) {
    if (skipIds.has(row.id)) continue;

    if (row.fixedTransactionId) {
      const existing = earliestByFixedId.get(row.fixedTransactionId);
      if (!existing) {
        earliestByFixedId.set(row.fixedTransactionId, { tx: row, count: 1, maxId: row.id });
      } else {
        existing.count += 1;
        if (row.id > existing.maxId) existing.maxId = row.id;
        if (row.dueDate < existing.tx.dueDate || (row.dueDate === existing.tx.dueDate && row.id < existing.tx.id)) {
          existing.tx = row;
        }
      }
    } else if (row.installmentTotal && row.installmentTotal > 1) {
      const groupKey = row.installmentParentId || row.id;
      const existing = earliestByInstallmentParentId.get(groupKey);
      if (!existing) {
        earliestByInstallmentParentId.set(groupKey, { tx: row, count: 1, maxId: row.id });
      } else {
        existing.count += 1;
        if (row.id > existing.maxId) existing.maxId = row.id;
        const rowCurr = row.installmentCurrent ?? 999;
        const exCurr = existing.tx.installmentCurrent ?? 999;
        if (rowCurr < exCurr || (rowCurr === exCurr && row.id < existing.tx.id)) {
          existing.tx = row;
        }
      }
    }
  }

  const results = [];

  for (const row of recentRows) {
    if (skipIds.has(row.id)) continue;

    let targetTx = row;
    let batchCount = 1;

    if (row.fixedTransactionId) {
      if (seenFixedBatch.has(row.fixedTransactionId)) continue;
      seenFixedBatch.add(row.fixedTransactionId);
      const group = earliestByFixedId.get(row.fixedTransactionId);
      if (group) {
        targetTx = group.tx;
        batchCount = group.count;
      }
    } else if (row.installmentTotal && row.installmentTotal > 1) {
      const groupKey = row.installmentParentId || row.id;
      if (seenInstallmentBatch.has(groupKey)) continue;
      seenInstallmentBatch.add(groupKey);
      const group = earliestByInstallmentParentId.get(groupKey);
      if (group) {
        targetTx = group.tx;
        batchCount = group.count;
      }
    }

    const transferDest = targetTx.type === "transfer" ? transferDestByOriginId.get(targetTx.id) : undefined;
    const cleanDescription =
      targetTx.type === "transfer"
        ? targetTx.description.replace(/\s*\((Saída|Entrada)\)/gi, "").trim()
        : targetTx.description;

    results.push({
      id: targetTx.id,
      type: targetTx.type,
      description: cleanDescription,
      amount: targetTx.amount,
      dueDate: targetTx.dueDate,
      launchDate: targetTx.launchDate,
      competencyMonth: targetTx.competencyMonth,
      invoiceMonth: targetTx.invoiceMonth,
      status: targetTx.status,
      isFixed: targetTx.isFixed || Boolean(targetTx.fixedTransactionId),
      fixedTransactionId: targetTx.fixedTransactionId,
      installmentCurrent: targetTx.installmentCurrent,
      installmentTotal: targetTx.installmentTotal,
      parentTransactionId: targetTx.parentTransactionId,
      installmentParentId: targetTx.installmentParentId,
      accountId: targetTx.accountId,
      creditCardId: targetTx.creditCardId,
      categoryId: targetTx.categoryId,
      subcategoryId: targetTx.subcategoryId,
      isTransferGroup: Boolean(transferDest),
      originAccount: transferDest && targetTx.account ? { id: targetTx.account.id, name: targetTx.account.name } : null,
      destinationAccount:
        transferDest && transferDest.account ? { id: transferDest.account.id, name: transferDest.account.name } : null,
      account: targetTx.account ? { id: targetTx.account.id, name: targetTx.account.name } : null,
      creditCard: targetTx.creditCard
        ? {
            id: targetTx.creditCard.id,
            name: targetTx.creditCard.name,
            dueDay: targetTx.creditCard.dueDay,
            closingDay: targetTx.creditCard.closingDay,
          }
        : null,
      category: targetTx.category
        ? { id: targetTx.category.id, name: targetTx.category.name, icon: targetTx.category.icon }
        : null,
      subcategory: targetTx.subcategory ? { id: targetTx.subcategory.id, name: targetTx.subcategory.name } : null,
      batchCount,
    });

    if (results.length >= limit) break;
  }

  return results;
}
