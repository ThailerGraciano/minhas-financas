import { SQL, and, eq, ne, or, isNull } from 'drizzle-orm';
import { transactions } from '@/db/schema';
import { parseISO, subMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Retorna o "Mês de Fatura" alvo dado o "Mês de Competência Global" (e.g. Agosto),
 * considerando o vencimento do cartão e o fechamento global.
 *
 * Exemplo:
 * Se globalMonth = '2026-08', globalClosingDay = 21, cardDueDay = 28
 * Como cardDueDay > globalClosingDay, a fatura paga no ciclo global de Agosto é a fatura de Julho ('2026-07').
 */
export function getTargetInvoiceMonth(globalMonth: string, globalClosingDay: number, cardDueDay: number): string {
  // Se o vencimento do cartão for DEPOIS do fechamento global, a fatura cai no ciclo global SEGUINTE.
  // Portanto, para saber qual fatura pertence a este ciclo global, precisamos pegar a fatura do mês ANTERIOR.
  if (cardDueDay > globalClosingDay) {
    const date = parseISO(`${globalMonth}-01`);
    return format(subMonths(date, 1), 'yyyy-MM');
  }
  return globalMonth;
}

/**
 * Constrói uma condição ORM do Drizzle que agrupa as transações que pertencem
 * ao ciclo de competência global informado, remanejando os cartões de crédito
 * automaticamente (se a fatura vence após o closing day global, ela cai no ciclo global seguinte).
 * 
 * ATENÇÃO: Retorna o bloco condicional completo (que já inclui o userId),
 * podendo ser passado diretamente para o Drizzle 'where' ou encadeado dentro de um 'and()'.
 */
export function buildGlobalCompetencyCondition(
  currentMonth: string,
  globalClosingDay: number,
  userId: string,
  userCards: { id: number; dueDay: number }[]
): SQL {
  if (!userCards || userCards.length === 0) {
    return and(
      eq(transactions.userId, userId),
      eq(transactions.competencyMonth, currentMonth)
    )!;
  }

  const ccConditions: SQL[] = [];

  for (const card of userCards) {
    const targetInvoiceMonth = getTargetInvoiceMonth(currentMonth, globalClosingDay, card.dueDay);
    ccConditions.push(
      and(
        eq(transactions.creditCardId, card.id),
        or(
          eq(transactions.invoiceMonth, targetInvoiceMonth),
          and(
            isNull(transactions.invoiceMonth),
            eq(transactions.competencyMonth, targetInvoiceMonth)
          )
        )
      )!
    );
  }

  return and(
    eq(transactions.userId, userId),
    or(
      and(
        ne(transactions.type, 'credit_card_expense'),
        eq(transactions.competencyMonth, currentMonth)
      ),
      and(
        eq(transactions.type, 'credit_card_expense'),
        or(...ccConditions)
      )
    )
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
  userCards: { id: number; dueDay: number }[]
): SQL {
  if (!userCards || userCards.length === 0) {
    return eq(transactions.id, -1);
  }

  const ccConditions: SQL[] = [];

  for (const card of userCards) {
    ccConditions.push(
      and(
        eq(transactions.creditCardId, card.id),
        or(
          eq(transactions.invoiceMonth, currentMonth),
          and(
            isNull(transactions.invoiceMonth),
            eq(transactions.competencyMonth, currentMonth)
          )
        )
      )!
    );
  }

  return and(
    eq(transactions.userId, userId),
    eq(transactions.type, 'credit_card_expense'),
    or(...ccConditions)
  )!;
}

/**
 * Gera uma lista de opções de meses de fatura ao redor de uma data base
 * (útil para Selects de fatura em formulários e grids).
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
