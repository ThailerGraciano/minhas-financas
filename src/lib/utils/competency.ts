import { addMonths, setDate } from 'date-fns';

export function calculateCreditCardDueDate(purchaseDate: Date, closingDay: number, dueDay: number): Date {
  let targetDate = new Date(purchaseDate);

  // Se a data de compra for no dia de fechamento ou após, vai para a fatura do mês seguinte
  if (purchaseDate.getDate() >= closingDay) {
    targetDate = addMonths(targetDate, 1);
  }

  // Define o dia do vencimento da fatura
  return setDate(targetDate, dueDay);
}
