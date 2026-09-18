import { transactions } from "@/db/schema";
import { addMonths, endOfMonth, format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SQL, and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";

/**
 * Retorna o "Mês de Fatura" alvo dado o "Mês de Competência Global" (e.g. Agosto),
 * considerando o vencimento do cartão e o fechamento global.
 *
 * Exemplo:
 * Se globalMonth = '2026-08', globalClosingDay = 21, cardDueDay = 28
 * Como cardDueDay > globalClosingDay, a fatura paga no ciclo global de Agosto é a fatura de Julho ('2026-07').
 */
export function getTargetInvoiceMonth(globalMonth: string, globalClosingDay: number, cardDueDay: number): string {
  if (cardDueDay > globalClosingDay) {
    const date = parseISO(`${globalMonth}-01`);
    return format(subMonths(date, 1), "yyyy-MM");
  }
  return globalMonth;
}

/**
 * Constrói uma condição ORM do Drizzle que agrupa as transações que pertencem
 * ao ciclo de competência global informado.
 * Para despesas comuns (não cartão), filtra rigorosamente pelo intervalo de datas do ciclo (date).
 * Para cartões de crédito, usa a competência/fatura mapeada.
 */
export function buildGlobalCompetencyCondition(
  currentMonth: string,
  globalClosingDay: number,
  userId: string,
  userCards: { id: number; dueDay: number; closingDay: number }[],
  dateMode: "due_date" | "launch_date" = "due_date",
): SQL {
  const currentMonthDate = parseISO(`${currentMonth}-01`);
  const prevMonthDate = subMonths(currentMonthDate, 1);

  const cycleEndDay = Math.min(globalClosingDay, endOfMonth(currentMonthDate).getDate());
  const cycleStartDay = Math.min(globalClosingDay + 1, endOfMonth(prevMonthDate).getDate());

  const endDateStr = format(currentMonthDate, `yyyy-MM-${String(cycleEndDay).padStart(2, "0")}`);
  const startDateStr = format(prevMonthDate, `yyyy-MM-${String(cycleStartDay).padStart(2, "0")}`);

  if (dateMode === "launch_date") {
    return and(
      eq(transactions.userId, userId),
      gte(transactions.launchDate, startDateStr),
      lte(transactions.launchDate, endDateStr),
    )!;
  }

  const normalTransactionsCondition = and(
    ne(transactions.type, "credit_card_expense"),
    gte(transactions.dueDate, startDateStr),
    lte(transactions.dueDate, endDateStr),
  )!;

  if (!userCards || userCards.length === 0) {
    return and(eq(transactions.userId, userId), normalTransactionsCondition)!;
  }

  const ccConditions: SQL[] = [];
  for (const card of userCards) {
    const targetInvoiceMonth = getTargetInvoiceMonth(currentMonth, globalClosingDay, card.dueDay);

    ccConditions.push(
      and(eq(transactions.creditCardId, card.id), getInvoiceCondition(targetInvoiceMonth, card.closingDay))!,
    );
  }

  return and(
    eq(transactions.userId, userId),
    or(normalTransactionsCondition, and(eq(transactions.type, "credit_card_expense"), or(...ccConditions))),
  )!;
}

/**
 * Constrói uma condição ORM do Drizzle apenas para despesas de cartão de crédito,
 * mapeando os meses de fatura corretos baseados no fechamento global.
 */
export function buildCreditCardCompetencyCondition(
  currentMonth: string,
  globalClosingDay: number,
  userId: string,
  userCards: { id: number; dueDay: number; closingDay: number }[],
): SQL {
  if (!userCards || userCards.length === 0) {
    return eq(transactions.id, -1);
  }

  const ccConditions: SQL[] = [];

  for (const card of userCards) {
    ccConditions.push(and(eq(transactions.creditCardId, card.id), getInvoiceCondition(currentMonth, card.closingDay))!);
  }

  return and(eq(transactions.userId, userId), eq(transactions.type, "credit_card_expense"), or(...ccConditions))!;
}

/**
 * Retorna a condição que localiza transações pertencentes à fatura `targetInvoiceMonth`
 * de um cartão, baseando-se no `invoiceMonth` explícito ou no intervalo de datas do ciclo da fatura.
 */
export function getInvoiceCondition(targetInvoiceMonth: string, cardClosingDay: number): SQL {
  const targetMonthDate = parseISO(`${targetInvoiceMonth}-01`);
  const targetPrevMonthDate = subMonths(targetMonthDate, 1);
  const cardCycleEndDay = Math.min(cardClosingDay, endOfMonth(targetMonthDate).getDate());
  const cardCycleStartDay = Math.min(cardClosingDay + 1, endOfMonth(targetPrevMonthDate).getDate());

  const cardEndDateStr = format(targetMonthDate, `yyyy-MM-${String(cardCycleEndDay).padStart(2, "0")}`);
  const cardStartDateStr = format(targetPrevMonthDate, `yyyy-MM-${String(cardCycleStartDay).padStart(2, "0")}`);

  return or(
    eq(transactions.invoiceMonth, targetInvoiceMonth),
    and(
      isNull(transactions.invoiceMonth),
      gte(transactions.dueDate, cardStartDateStr),
      lte(transactions.dueDate, cardEndDateStr),
    ),
  )!;
}

/**
 * Gera uma lista de opções de meses de fatura ao redor de uma data base
 */
export function generateInvoiceOptions(baseDateStr?: string): { value: string; label: string }[] {
  const baseDate = baseDateStr ? parseISO(baseDateStr) : new Date();

  const options = [];
  for (let i = -6; i <= 12; i++) {
    const d = addMonths(baseDate, i);
    const value = format(d, "yyyy-MM");
    const label = format(d, "MMMM/yyyy", { locale: ptBR });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}
