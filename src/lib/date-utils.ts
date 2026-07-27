import { format, addMonths } from 'date-fns';

/**
 * Calculates the default competency month based on the closing day.
 * If the current day of the month is strictly greater than the closing day, 
 * it shifts the default month to the next month.
 */
export function getDefaultCompetencyMonth(closingDay: number): string {
  const today = new Date();
  if (today.getDate() > closingDay) {
    return format(addMonths(today, 1), 'yyyy-MM');
  }
  return format(today, 'yyyy-MM');
}
