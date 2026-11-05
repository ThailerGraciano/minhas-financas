import { calculateBalanceDelta } from "@/lib/balance-utils";
import {
  calculateCreditCardDueDate,
  getCompetencyMonth,
  getTargetInvoiceMonth,
} from "@/lib/competency-utils";
import { describe, expect, it } from "vitest";

describe("Competency Utils", () => {
  it("deve retornar o mês corrente se o dia for <= dia de fechamento", () => {
    const date = new Date(2026, 7, 20); // 20 de Agosto de 2026
    const closingDay = 25;
    expect(getCompetencyMonth(date, closingDay)).toBe("2026-08");
  });

  it("deve retornar o próximo mês se o dia for > dia de fechamento", () => {
    const date = new Date(2026, 7, 26); // 26 de Agosto de 2026
    const closingDay = 25;
    expect(getCompetencyMonth(date, closingDay)).toBe("2026-09");
  });

  it("deve avançar o ano corretamente no fechamento de Dezembro", () => {
    const date = new Date(2026, 11, 28); // 28 de Dezembro de 2026
    const closingDay = 25;
    expect(getCompetencyMonth(date, closingDay)).toBe("2027-01");
  });

  it("deve calcular o vencimento de cartão de crédito no mesmo ciclo antes do fechamento", () => {
    const purchaseDate = new Date(2026, 7, 10); // 10 de Agosto
    const closingDay = 20;
    const dueDay = 28;
    const dueDate = calculateCreditCardDueDate(purchaseDate, closingDay, dueDay);
    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(7); // Agosto
    expect(dueDate.getDate()).toBe(28);
  });

  it("deve calcular o vencimento de cartão para o mês subsequente após o fechamento", () => {
    const purchaseDate = new Date(2026, 7, 22); // 22 de Agosto
    const closingDay = 20;
    const dueDay = 28;
    const dueDate = calculateCreditCardDueDate(purchaseDate, closingDay, dueDay);
    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(8); // Setembro
    expect(dueDate.getDate()).toBe(28);
  });

  it("getTargetInvoiceMonth deve retroagir um mês caso o vencimento seja posterior ao fechamento global", () => {
    expect(getTargetInvoiceMonth("2026-08", 21, 28)).toBe("2026-07");
    expect(getTargetInvoiceMonth("2026-08", 25, 20)).toBe("2026-08");
  });
});

describe("Balance Utils - calculateBalanceDelta", () => {
  it("deve ignorar transações não pagas", () => {
    expect(calculateBalanceDelta(100, "income", "pending")).toBe(0);
    expect(calculateBalanceDelta(100, "expense", "partial")).toBe(0);
  });

  it("deve calcular delta positivo para receita paga", () => {
    expect(calculateBalanceDelta(150.5, "income", "paid")).toBe(150.5);
    expect(calculateBalanceDelta(150.5, "income", "paid", null, true)).toBe(-150.5); // Revert
  });

  it("deve calcular delta negativo para despesa ou fatura paga", () => {
    expect(calculateBalanceDelta(80, "expense", "paid")).toBe(-80);
    expect(calculateBalanceDelta(80, "credit_card_expense", "paid")).toBe(-80);
    expect(calculateBalanceDelta(80, "expense", "paid", null, true)).toBe(80); // Revert
  });

  it("deve calcular delta correto para transferências de saída e entrada", () => {
    // Saída (sem parentTransactionId)
    expect(calculateBalanceDelta(300, "transfer", "paid", null)).toBe(-300);
    expect(calculateBalanceDelta(300, "transfer", "paid", null, true)).toBe(300);

    // Entrada (com parentTransactionId)
    expect(calculateBalanceDelta(300, "transfer", "paid", 999)).toBe(300);
    expect(calculateBalanceDelta(300, "transfer", "paid", 999, true)).toBe(-300);
  });
});

