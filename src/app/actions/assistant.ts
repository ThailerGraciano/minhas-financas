"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, categories, creditCards, settings, transactions } from "@/db/schema";
import { buildGlobalCompetencyCondition } from "@/lib/competency-utils";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import {
  Content,
  FunctionDeclaration,
  GoogleGenerativeAI,
  Part,
  SchemaType,
} from "@google/generative-ai";
import { and, desc, eq, ilike, ne, SQL } from "drizzle-orm";
import { z } from "zod";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export type AssistantActionResult =
  | {
      success: true;
      reply: string;
      toolsUsed: string[];
    }
  | {
      success: false;
      error: string;
    };

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const COMPETENCY_MONTH_REGEX = /^\d{4}-\d{2}$/;

const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const askAssistantInputSchema = z.object({
  history: z.array(chatMessageSchema),
  userMessage: z
    .string()
    .trim()
    .min(1, "Digite uma mensagem para o assistente.")
    .max(MAX_MESSAGE_LENGTH, "A mensagem excede o limite de caracteres permitido."),
});

const getCompetencySummaryArgsSchema = z.object({
  competencyMonth: z.string().regex(COMPETENCY_MONTH_REGEX).optional(),
});

const searchTransactionsArgsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  competencyMonth: z.string().regex(COMPETENCY_MONTH_REGEX).optional(),
  type: z.enum(["income", "expense", "transfer", "credit_card_expense"]).optional(),
  status: z.enum(["pending", "paid", "ignored"]).optional(),
});

interface UserCardSummary {
  id: number;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
}

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_accounts_balance",
    description:
      "Retorna todas as contas bancárias, carteiras e reservas do usuário com seus respectivos saldos atuais.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_competency_summary",
    description:
      "Retorna o resumo financeiro (receitas, despesas, pagas, pendentes e saldo líquido) de um mês de competência específico (formato YYYY-MM), usando a mesma regra de ciclo do dashboard.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        competencyMonth: {
          type: SchemaType.STRING,
          description: "Mês de competência no formato YYYY-MM (ex: 2026-11). Se omitido, usa o mês de competência atual.",
        },
      },
    },
  },
  {
    name: "get_credit_cards",
    description:
      "Retorna os cartões de crédito cadastrados do usuário com limite, dia de fechamento e dia de vencimento.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "search_transactions",
    description:
      "Busca transações financeiras do usuário por descrição, mês de competência, tipo ou status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Texto para buscar na descrição da transação (opcional).",
        },
        competencyMonth: {
          type: SchemaType.STRING,
          description: "Filtrar pelo ciclo do mês de competência no formato YYYY-MM (opcional).",
        },
        type: {
          type: SchemaType.STRING,
          description: "Filtrar por tipo: income, expense, transfer ou credit_card_expense (opcional).",
        },
        status: {
          type: SchemaType.STRING,
          description: "Filtrar por status: pending, paid ou ignored (opcional).",
        },
      },
    },
  },
];

function sanitizeHistoryForGemini(history: ChatMessage[]): Content[] {
  const sliced = history.slice(-MAX_HISTORY_MESSAGES);
  const normalized: ChatMessage[] = [];

  for (const msg of sliced) {
    if (normalized.length === 0 && msg.role !== "user") {
      continue;
    }
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === msg.role) {
      normalized[normalized.length - 1] = msg;
    } else {
      normalized.push(msg);
    }
  }

  // O histórico enviado ao startChat deve terminar com resposta do model (pois sendMessage enviará o próximo user turn)
  if (normalized.length > 0 && normalized[normalized.length - 1].role === "user") {
    normalized.pop();
  }

  return normalized.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
}

async function executeToolCall(
  userId: string,
  closingDay: number,
  currentCompetencyMonth: string,
  userCards: UserCardSummary[],
  name: string,
  rawArgs: unknown,
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_accounts_balance": {
      const rows = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
          currentBalance: accounts.currentBalance,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .orderBy(desc(accounts.currentBalance));

      const totalBalance = rows.reduce((sum, acc) => sum + Number(acc.currentBalance), 0);
      return { accounts: rows, totalBalance: totalBalance.toFixed(2) };
    }

    case "get_competency_summary": {
      const parsedArgs = getCompetencySummaryArgsSchema.safeParse(rawArgs ?? {});
      const monthArg = parsedArgs.success && parsedArgs.data.competencyMonth
        ? parsedArgs.data.competencyMonth
        : currentCompetencyMonth;

      const condition = buildGlobalCompetencyCondition(
        monthArg,
        closingDay,
        userId,
        userCards,
        "due_date",
      );

      const rows = await db
        .select({
          type: transactions.type,
          status: transactions.status,
          amount: transactions.amount,
          installmentTotal: transactions.installmentTotal,
          fixedTransactionId: transactions.fixedTransactionId,
          isFixed: transactions.isFixed,
        })
        .from(transactions)
        .where(and(condition, ne(transactions.status, "ignored")));

      let totalIncome = 0;
      let totalExpense = 0;
      let paidExpense = 0;
      let pendingExpense = 0;
      let fixedExpense = 0;
      let variableExpense = 0;
      let installmentExpense = 0;

      for (const row of rows) {
        const val = Number(row.amount);
        if (row.type === "income") {
          totalIncome += val;
        } else if (row.type === "expense" || row.type === "credit_card_expense") {
          totalExpense += val;
          if (row.status === "paid") paidExpense += val;
          else if (row.status === "pending") pendingExpense += val;

          const isInstallment = Boolean(row.installmentTotal && row.installmentTotal > 1);
          const isFixed = Boolean(row.fixedTransactionId || row.isFixed);
          if (isInstallment) installmentExpense += val;
          else if (isFixed) fixedExpense += val;
          else variableExpense += val;
        }
      }

      return {
        competencyMonth: monthArg,
        closingDay,
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        paidExpense: paidExpense.toFixed(2),
        pendingExpense: pendingExpense.toFixed(2),
        fixedExpense: fixedExpense.toFixed(2),
        variableExpense: variableExpense.toFixed(2),
        installmentExpense: installmentExpense.toFixed(2),
        netBalance: (totalIncome - totalExpense).toFixed(2),
        transactionCount: rows.length,
      };
    }

    case "get_credit_cards": {
      return { creditCards: userCards };
    }

    case "search_transactions": {
      const parsedArgs = searchTransactionsArgsSchema.safeParse(rawArgs ?? {});
      const filters = parsedArgs.success ? parsedArgs.data : {};

      const conditions: SQL[] = [eq(transactions.userId, userId)];

      if (filters.competencyMonth) {
        conditions.push(
          buildGlobalCompetencyCondition(
            filters.competencyMonth,
            closingDay,
            userId,
            userCards,
            "due_date",
          ),
        );
      }
      if (filters.query) {
        conditions.push(ilike(transactions.description, `%${filters.query}%`));
      }
      if (filters.type) {
        conditions.push(eq(transactions.type, filters.type));
      }
      if (filters.status) {
        conditions.push(eq(transactions.status, filters.status));
      } else {
        conditions.push(ne(transactions.status, "ignored"));
      }

      const rows = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          type: transactions.type,
          status: transactions.status,
          dueDate: transactions.dueDate,
          competencyMonth: transactions.competencyMonth,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.dueDate))
        .limit(20);

      return { transactions: rows, count: rows.length };
    }

    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

export async function askFinancialAssistant(
  history: ChatMessage[],
  userMessage: string,
): Promise<AssistantActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado. Faça login novamente." };
    }
    const userId = session.user.id;

    const parsedInput = askAssistantInputSchema.safeParse({ history, userMessage });
    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0]?.message ?? "Mensagem inválida.",
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Chave da API do Gemini (GEMINI_API_KEY) não configurada no servidor.",
      };
    }

    const [[userSettings], userCards] = await Promise.all([
      db
        .select({ closingDay: settings.closingDay })
        .from(settings)
        .where(eq(settings.userId, userId))
        .limit(1),
      db
        .select({
          id: creditCards.id,
          name: creditCards.name,
          creditLimit: creditCards.creditLimit,
          closingDay: creditCards.closingDay,
          dueDay: creditCards.dueDay,
        })
        .from(creditCards)
        .where(eq(creditCards.userId, userId)),
    ]);

    const closingDay = userSettings?.closingDay ?? 25;
    const currentMonth = getDefaultCompetencyMonth(closingDay);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Você é o assistente financeiro pessoal do aplicativo "Minhas Finanças".
Responda sempre em português do Brasil, de forma clara, objetiva e amigável.
Use valores monetários formatados em Reais (R$ X.XXX,XX).
Contexto do usuário:
- Mês de competência atual: ${currentMonth}
- Dia de fechamento do ciclo financeiro (closing_day): dia ${closingDay}
Sempre use as ferramentas disponíveis para consultar os dados reais do usuário antes de responder perguntas sobre saldos, gastos, receitas, cartões ou transações. Nunca invente números.`,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const formattedHistory = sanitizeHistoryForGemini(parsedInput.data.history);
    const chat = model.startChat({ history: formattedHistory });
    const toolsUsed: string[] = [];

    let result = await chat.sendMessage(parsedInput.data.userMessage);
    let response = result.response;

    // Loop de function calling (máximo 5 iterações por segurança)
    for (let i = 0; i < 5; i++) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      const functionResponses: Part[] = [];
      for (const call of functionCalls) {
        toolsUsed.push(call.name);
        const toolResult = await executeToolCall(
          userId,
          closingDay,
          currentMonth,
          userCards,
          call.name,
          call.args,
        );

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    return {
      success: true,
      reply: response.text(),
      toolsUsed: Array.from(new Set(toolsUsed)),
    };
  } catch (error) {
    console.error("Erro ao consultar assistente financeiro:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? `Não foi possível consultar o assistente: ${error.message}`
          : "Ocorreu um erro inesperado ao consultar o assistente financeiro.",
    };
  }
}
