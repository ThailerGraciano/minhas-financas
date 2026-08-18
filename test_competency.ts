import { addMonths, format, parseISO, getDate, setDate } from 'date-fns';

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

function calculateCreditCardDueDate(purchaseDate: Date, closingDay: number, dueDay: number): Date {
  let targetDate = new Date(purchaseDate);
  if (purchaseDate.getDate() >= closingDay) {
    targetDate = addMonths(targetDate, 1);
  }
  return setDate(targetDate, dueDay);
}

const txDate = "2026-08-20";
const parsedDate = parseISO(txDate);
console.log("parsedDate:", parsedDate.toISOString(), "Local time:", parsedDate.toString());

const closingDay = 21;
const dueDay = 28;

const dueDate = calculateCreditCardDueDate(parsedDate, closingDay, dueDay);
console.log("dueDate:", dueDate.toISOString(), "Local time:", dueDate.toString());

const correctCompetency = getCompetencyMonth(dueDate, closingDay);
console.log("correctCompetency:", correctCompetency);

const purchaseDateLocal = new Date(2026, 7, 20); // August 20
console.log("purchaseDateLocal:", purchaseDateLocal.toString());
const dueDateLocal = calculateCreditCardDueDate(purchaseDateLocal, closingDay, dueDay);
console.log("dueDateLocal:", dueDateLocal.toISOString(), "Local time:", dueDateLocal.toString());
console.log("correctCompetencyLocal:", getCompetencyMonth(dueDateLocal, closingDay));

