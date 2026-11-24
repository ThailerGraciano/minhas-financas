"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { categories, subcategories, transactions } from "@/db/schema";
import { getInvoiceCondition } from "@/lib/competency-utils";
import {
  INVOICE_RECONCILIATION_SYSTEM_PROMPT,
  invoiceReconciliationResponseSchema,
} from "@/lib/invoice-reconciliation-prompts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { endOfMonth, format, parseISO } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const COMPETENCY_MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const analyzeFileSchema = z.discriminatedUnion("fileType", [
  z.object({
    fileType: z.literal("pdf"),
    base64: z.string().min(1, "Arquivo PDF vazio."),
  }),
  z.object({
    fileType: z.literal("csv"),
    text: z.string().min(1, "Arquivo CSV vazio."),
  }),
]);

const analyzeInputSchema = z.object({
  creditCardId: z.number().int().positive(),
  competencyMonth: z.string().regex(COMPETENCY_MONTH_REGEX, "Competência inválida."),
  file: analyzeFileSchema,
});

const aiMatchedSchema = z.object({
  appTransactionId: z.number().int(),
  bankDescription: z.string(),
  bankDate: z.string(),
  bankAmount: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

const aiToAddSchema = z.object({
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  suggestedCategoryId: z.number().int().nullable().optional(),
  suggestedSubcategoryId: z.number().int().nullable().optional(),
  installmentCurrent: z.number().int().nullable().optional(),
  installmentTotal: z.number().int().nullable().optional(),
  reason: z.string(),
});

const aiToRemoveSchema = z.object({
  appTransactionId: z.number().int(),
  reason: z.string(),
});

const aiReconciliationResponseSchema = z.object({
  invoiceTotal: z.number(),
  matched: z.array(aiMatchedSchema),
  toAdd: z.array(aiToAddSchema),
  toRemove: z.array(aiToRemoveSchema),
});

export interface MatchedReconciliationItem {
  appTransactionId: number;
  appDescription: string;
  appAmount: number;
  appDate: string;
  bankDescription: string;
  bankDate: string;
  bankAmount: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface ToAddReconciliationItem {
  tempId: string;
  description: string;
  amount: number;
  date: string;
  suggestedCategoryId: number | null;
  suggestedSubcategoryId: number | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  reason: string;
}

export interface ToRemoveReconciliationItem {
  appTransactionId: number;
  appDescription: string;
  appAmount: number;
  appDate: string;
  categoryName: string | null;
  installmentInfo: string | null;
  reason: string;
}

export interface ReconciliationAnalysisResult {
  invoiceTotal: number;
  appTotal: number;
  matched: MatchedReconciliationItem[];
  toAdd: ToAddReconciliationItem[];
  toRemove: ToRemoveReconciliationItem[];
}

export type AnalyzeReconciliationResponse =
  | { success: true; data: ReconciliationAnalysisResult }
  | { success: false; error: string };

const applyAdditionSchema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória.").max(255),
  amount: z.number().refine((val) => !Number.isNaN(val) && Math.abs(val) >= 0.01, "Valor inválido."),
  date: z.string().regex(DATE_REGEX, "Data inválida (YYYY-MM-DD)."),
  categoryId: z.number().int().positive().nullable(),
  subcategoryId: z.number().int().positive().nullable(),
  installmentCurrent: z.number().int().positive().nullable().optional(),
  installmentTotal: z.number().int().positive().nullable().optional(),
});

const applyReconciliationSchema = z.object({
  creditCardId: z.number().int().positive(),
  competencyMonth: z.string().regex(COMPETENCY_MONTH_REGEX, "Competência inválida."),
  defaultStatus: z.enum(["pending", "paid"]).default("pending"),
  additions: z.array(applyAdditionSchema),
  removalIds: z.array(z.number().int().positive()),
});

export type ApplyReconciliationInput = z.infer<typeof applyReconciliationSchema>;

function normalizeDateString(rawDate: string, fallbackMonth: string): string {
  if (DATE_REGEX.test(rawDate)) {
    return rawDate;
  }
  return `${fallbackMonth}-01`;
}

function buildInvoiceDueDate(competencyMonth: string, dueDay: number): string {
  const monthDate = parseISO(`${competencyMonth}-01`);
  const clampedDay = Math.min(Math.max(1, dueDay), endOfMonth(monthDate).getDate());
  return format(monthDate, `yyyy-MM-${String(clampedDay).padStart(2, "0")}`);
}

export async function analyzeInvoiceReconciliation(
  rawInput: z.infer<typeof analyzeInputSchema>,
): Promise<AnalyzeReconciliationResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Usuário não autenticado." };
    }
    const userId = session.user.id;

    const parsedInput = analyzeInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0]?.message ?? "Dados inválidos para análise.",
      };
    }

    const { creditCardId, competencyMonth, file } = parsedInput.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Chave da API do Gemini (GEMINI_API_KEY) não configurada no servidor.",
      };
    }

    const card = await db.query.creditCards.findFirst({
      where: (c, { and: andOp, eq: eqOp }) => andOp(eqOp(c.id, creditCardId), eqOp(c.userId, userId)),
    });
    if (!card) {
      return { success: false, error: "Cartão de crédito não encontrado." };
    }

    const [currentTransactions, expenseCategories] = await Promise.all([
      db.query.transactions.findMany({
        where: (t, { and: andOp, eq: eqOp, isNull: isNullOp, ne: neOp, or: orOp }) =>
          andOp(
            eqOp(t.creditCardId, creditCardId),
            orOp(eqOp(t.invoiceMonth, competencyMonth), andOp(isNullOp(t.invoiceMonth), eqOp(t.competencyMonth, competencyMonth))),
            getInvoiceCondition(competencyMonth, card.closingDay),
            eqOp(t.type, "credit_card_expense"),
            neOp(t.status, "ignored"),
            eqOp(t.userId, userId),
          ),
        with: {
          category: true,
          subcategory: true,
        },
        orderBy: (t, { desc }) => [desc(t.launchDate), desc(t.dueDate)],
      }),
      db.query.categories.findMany({
        where: (c, { and: andOp, eq: eqOp }) => andOp(eqOp(c.userId, userId), eqOp(c.type, "expense")),
        with: {
          subcategories: true,
        },
      }),
    ]);

    const txById = new Map(currentTransactions.map((tx) => [tx.id, tx]));
    const categoryIds = new Set(expenseCategories.map((c) => c.id));
    const subcategoryToCategory = new Map<number, number>();
    for (const cat of expenseCategories) {
      for (const sub of cat.subcategories) {
        subcategoryToCategory.set(sub.id, cat.id);
      }
    }

    let appTotal = 0;
    for (const tx of currentTransactions) {
      appTotal += Number(tx.amount);
    }

    const contextPayload = {
      cardName: card.name,
      competencyMonth,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      existingAppTransactions: currentTransactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: Number(tx.amount),
        date: tx.launchDate || tx.dueDate,
        category: tx.category?.name ?? null,
        installmentCurrent: tx.installmentCurrent,
        installmentTotal: tx.installmentTotal,
      })),
      availableCategories: expenseCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        subcategories: cat.subcategories.map((sub) => ({
          id: sub.id,
          name: sub.name,
        })),
      })),
    };

    const promptText = `Analise a fatura anexada e concilie com os dados do aplicativo abaixo (JSON):\n${JSON.stringify(contextPayload)}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: INVOICE_RECONCILIATION_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: invoiceReconciliationResponseSchema,
      },
    });

    const result =
      file.fileType === "pdf"
        ? await model.generateContent([
            {
              inlineData: {
                mimeType: "application/pdf",
                data: file.base64,
              },
            },
            promptText,
          ])
        : await model.generateContent(`${promptText}\n\nCONTEÚDO CSV DA FATURA:\n${file.text}`);

    const rawJson = JSON.parse(result.response.text()) as unknown;
    const parsedAi = aiReconciliationResponseSchema.safeParse(rawJson);
    if (!parsedAi.success) {
      return {
        success: false,
        error: "A IA retornou um formato inesperado ao analisar a fatura. Tente novamente.",
      };
    }

    const seenAppIds = new Set<number>();
    const matched: MatchedReconciliationItem[] = [];

    for (const item of parsedAi.data.matched) {
      const appTx = txById.get(item.appTransactionId);
      if (!appTx || seenAppIds.has(item.appTransactionId)) {
        continue;
      }
      seenAppIds.add(item.appTransactionId);
      matched.push({
        appTransactionId: appTx.id,
        appDescription: appTx.description,
        appAmount: Number(appTx.amount),
        appDate: appTx.launchDate || appTx.dueDate,
        bankDescription: item.bankDescription,
        bankDate: normalizeDateString(item.bankDate, competencyMonth),
        bankAmount: Number(item.bankAmount.toFixed(2)),
        confidence: item.confidence,
        reason: item.reason,
      });
    }

    const toRemove: ToRemoveReconciliationItem[] = [];
    for (const item of parsedAi.data.toRemove) {
      const appTx = txById.get(item.appTransactionId);
      if (!appTx || seenAppIds.has(item.appTransactionId)) {
        continue;
      }
      seenAppIds.add(item.appTransactionId);
      toRemove.push({
        appTransactionId: appTx.id,
        appDescription: appTx.description,
        appAmount: Number(appTx.amount),
        appDate: appTx.launchDate || appTx.dueDate,
        categoryName: appTx.category?.name ?? null,
        installmentInfo:
          appTx.installmentCurrent && appTx.installmentTotal
            ? `${appTx.installmentCurrent}/${appTx.installmentTotal}`
            : null,
        reason: item.reason,
      });
    }

    // Garante que nenhuma transação do app fique sem classificação
    for (const appTx of currentTransactions) {
      if (!seenAppIds.has(appTx.id)) {
        toRemove.push({
          appTransactionId: appTx.id,
          appDescription: appTx.description,
          appAmount: Number(appTx.amount),
          appDate: appTx.launchDate || appTx.dueDate,
          categoryName: appTx.category?.name ?? null,
          installmentInfo:
            appTx.installmentCurrent && appTx.installmentTotal
              ? `${appTx.installmentCurrent}/${appTx.installmentTotal}`
              : null,
          reason: "Não identificada na fatura importada.",
        });
      }
    }

    const toAdd: ToAddReconciliationItem[] = parsedAi.data.toAdd.map((item, index) => {
      const validCatId =
        item.suggestedCategoryId && categoryIds.has(item.suggestedCategoryId) ? item.suggestedCategoryId : null;
      const validSubId =
        validCatId &&
        item.suggestedSubcategoryId &&
        subcategoryToCategory.get(item.suggestedSubcategoryId) === validCatId
          ? item.suggestedSubcategoryId
          : null;

      return {
        tempId: `add-${index}-${Date.now()}`,
        description: item.description.trim() || "Despesa da Fatura",
        amount: Number(item.amount.toFixed(2)),
        date: normalizeDateString(item.date, competencyMonth),
        suggestedCategoryId: validCatId,
        suggestedSubcategoryId: validSubId,
        installmentCurrent: item.installmentCurrent ?? null,
        installmentTotal: item.installmentTotal ?? null,
        reason: item.reason,
      };
    });

    return {
      success: true,
      data: {
        invoiceTotal: Number(parsedAi.data.invoiceTotal.toFixed(2)),
        appTotal: Number(appTotal.toFixed(2)),
        matched,
        toAdd,
        toRemove,
      },
    };
  } catch (error) {
    console.error("Erro ao analisar conciliação da fatura:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? `Falha ao analisar fatura: ${error.message}`
          : "Ocorreu um erro inesperado ao analisar a fatura.",
    };
  }
}

export async function applyInvoiceReconciliation(
  rawInput: ApplyReconciliationInput,
): Promise<{ success: true; addedCount: number; removedCount: number } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Usuário não autenticado." };
    }
    const userId = session.user.id;

    const parsed = applyReconciliationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos para aplicar conciliação.",
      };
    }

    const { creditCardId, competencyMonth, defaultStatus, additions, removalIds } = parsed.data;

    if (additions.length === 0 && removalIds.length === 0) {
      return { success: false, error: "Nenhuma alteração selecionada para aplicar." };
    }

    const card = await db.query.creditCards.findFirst({
      where: (c, { and: andOp, eq: eqOp }) => andOp(eqOp(c.id, creditCardId), eqOp(c.userId, userId)),
    });
    if (!card) {
      return { success: false, error: "Cartão de crédito não encontrado." };
    }

    const dueDate = buildInvoiceDueDate(competencyMonth, card.dueDay);

    const result = await db.transaction(async (tx) => {
      let fallbackCategoryId: number | null = null;
      let fallbackSubcategoryId: number | null = null;

      if (additions.some((a) => !a.categoryId)) {
        const existingFallback = await tx.query.categories.findFirst({
          where: (c, { and: andOp, eq: eqOp }) =>
            andOp(eqOp(c.userId, userId), eqOp(c.type, "expense"), eqOp(c.name, "Outros")),
        });

        if (existingFallback) {
          fallbackCategoryId = existingFallback.id;
        } else {
          const [createdCat] = await tx
            .insert(categories)
            .values({ userId, name: "Outros", type: "expense", icon: "Tag" })
            .returning();
          fallbackCategoryId = createdCat.id;
        }

        const existingSub = await tx.query.subcategories.findFirst({
          where: (s, { and: andOp, eq: eqOp }) =>
            andOp(eqOp(s.categoryId, fallbackCategoryId!), eqOp(s.userId, userId)),
        });

        if (existingSub) {
          fallbackSubcategoryId = existingSub.id;
        } else {
          const [createdSub] = await tx
            .insert(subcategories)
            .values({ userId, categoryId: fallbackCategoryId, name: "Geral" })
            .returning();
          fallbackSubcategoryId = createdSub.id;
        }
      }

      if (additions.length > 0) {
        await tx.insert(transactions).values(
          additions.map((item) => ({
            userId,
            type: "credit_card_expense",
            creditCardId,
            categoryId: item.categoryId ?? fallbackCategoryId!,
            subcategoryId: item.categoryId ? item.subcategoryId : fallbackSubcategoryId,
            amount: item.amount.toFixed(2),
            description: item.description,
            launchDate: item.date,
            dueDate,
            competencyMonth,
            invoiceMonth: competencyMonth,
            status: defaultStatus,
            paidAt: defaultStatus === "paid" ? new Date() : null,
            installmentCurrent: item.installmentCurrent ?? null,
            installmentTotal: item.installmentTotal ?? null,
          })),
        );
      }

      let removedCount = 0;
      if (removalIds.length > 0) {
        const deleted = await tx
          .delete(transactions)
          .where(
            and(
              inArray(transactions.id, removalIds),
              eq(transactions.userId, userId),
              eq(transactions.creditCardId, creditCardId),
            ),
          )
          .returning({ id: transactions.id });
        removedCount = deleted.length;
      }

      return { addedCount: additions.length, removedCount };
    });

    revalidatePath("/credit-cards");
    revalidatePath(`/credit-cards/${creditCardId}`);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/planning");

    return { success: true, ...result };
  } catch (error) {
    console.error("Erro ao aplicar conciliação da fatura:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? `Falha ao aplicar conciliação: ${error.message}`
          : "Ocorreu um erro inesperado ao salvar a conciliação.",
    };
  }
}
