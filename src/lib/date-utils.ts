import { getCompetencyMonth } from "@/lib/competency-utils";

/**
 * Retorna a data atual no fuso horário de São Paulo (America/Sao_Paulo),
 * evitando divergências quando o servidor roda em UTC.
 */
export function getTodayInBrazil(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Calculates the default competency month based on the closing day.
 * If the current day of the month is strictly greater than the closing day,
 * it shifts the default month to the next month.
 */
export function getDefaultCompetencyMonth(closingDay: number, now?: Date): string {
  return getCompetencyMonth(getTodayInBrazil(now), closingDay);
}
