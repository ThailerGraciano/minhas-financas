import { SQL, and, eq, ne, or } from 'drizzle-orm';
import { transactions } from '@/db/schema';
import { parseISO, subMonths, format } from 'date-fns';

/**
 * Retorna o "Mês de Fatura" alvo dado o "Mês de Competência Global" (e.g. Agosto),
 * considerando o vencimento do cartão e o fechamento global.
 *
 * Exemplo:
 * Se globalMonth = '2026-08', globalClosingDay = 21, cardDueDay = 28
 * Como cardDueDay > globalClosingDay, a fatura paga no ciclo global de Agosto é a fatura de Julho ('2026-07').
 */
export function getTargetInvoiceMonth(globalMonth: string, globalClosingDay: number, cardDueDay: number): string {
  const offset = cardDueDay > globalClosingDay ? 1 : 0;
  // Parse globalMonth (e.g., '2026-08') com dia 01
  const baseDate = parseISO(`${globalMonth}-01`);
  // Subtrai 'offset' meses e formata novamente
  return format(subMonths(baseDate, offset), 'yyyy-MM');
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
        eq(transactions.competencyMonth, targetInvoiceMonth)
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
    const targetInvoiceMonth = getTargetInvoiceMonth(currentMonth, globalClosingDay, card.dueDay);
    ccConditions.push(
      and(
        eq(transactions.creditCardId, card.id),
        eq(transactions.competencyMonth, targetInvoiceMonth)
      )!
    );
  }

  return and(
    eq(transactions.userId, userId),
    eq(transactions.type, 'credit_card_expense'),
    or(...ccConditions)
  )!;
}
