import { describe, expect, it } from "vitest";
import {
  computeConsumptionIntelligence,
  getCompetencyCycle,
  type ManualClassificationHistoryEntry,
  type RawConsumptionTransaction,
} from "../consumption-intelligence";

function makeTx(
  overrides: Partial<RawConsumptionTransaction> & Pick<RawConsumptionTransaction, "id" | "description" | "amount" | "launchDate">,
): RawConsumptionTransaction {
  return {
    type: "expense",
    dueDate: overrides.launchDate,
    status: "paid",
    isFixed: false,
    fixedTransactionId: null,
    loanId: null,
    installmentCurrent: null,
    installmentTotal: null,
    installmentParentId: null,
    parentTransactionId: null,
    creditCardId: null,
    accountId: 1,
    accountType: "checking",
    accountName: "Conta Principal",
    creditCardName: null,
    categoryId: 1,
    categoryName: "Mercado",
    categoryIcon: "ShoppingCart",
    categoryDefaultNature: "recurring",
    subcategoryId: 10,
    subcategoryName: "Reposição",
    subcategoryDefaultNature: null,
    persistedNature: null,
    persistedSource: null,
    ...overrides,
  };
}

describe("getCompetencyCycle - semanas relativas do ciclo", () => {
  it("divide ciclo com fechamento no fim do mês em semanas 01-07, 08-14, 15-21, 22-28 e 29-fim", () => {
    const nov = getCompetencyCycle("2026-11", 31, "2026-11-11");
    expect(nov.startDate).toBe("2026-11-01");
    expect(nov.endDate).toBe("2026-11-30");
    expect(nov.totalDays).toBe(30);
    expect(nov.weeks).toHaveLength(5);
    expect(nov.weeks[0]).toMatchObject({
      weekNumber: 1,
      startDate: "2026-11-01",
      endDate: "2026-11-07",
      state: "completed",
      elapsedDays: 7,
      isPartial: false,
    });
    expect(nov.weeks[1]).toMatchObject({
      weekNumber: 2,
      startDate: "2026-11-08",
      endDate: "2026-11-14",
      state: "in_progress",
      elapsedDays: 4,
      isPartial: true,
    });
    expect(nov.weeks[2]).toMatchObject({
      weekNumber: 3,
      startDate: "2026-11-15",
      endDate: "2026-11-21",
      state: "future",
      elapsedDays: 0,
      isPartial: false,
    });
    expect(nov.weeks[4]).toMatchObject({
      weekNumber: 5,
      startDate: "2026-11-29",
      endDate: "2026-11-30",
      dayCount: 2,
    });

    const feb = getCompetencyCycle("2026-02", 31, "2026-02-10");
    expect(feb.totalDays).toBe(28);
    expect(feb.weeks).toHaveLength(4);
  });

  it("divide ciclo com closingDay = 25 corretamente (dia 26 a dia 25)", () => {
    const cycle = getCompetencyCycle("2026-11", 25, "2026-11-05");
    expect(cycle.startDate).toBe("2026-10-26");
    expect(cycle.endDate).toBe("2026-11-25");
    expect(cycle.totalDays).toBe(31);
    expect(cycle.weeks[0]).toMatchObject({
      weekNumber: 1,
      startDate: "2026-10-26",
      endDate: "2026-11-01",
      state: "completed",
    });
    expect(cycle.weeks[1]).toMatchObject({
      weekNumber: 2,
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      state: "in_progress",
      elapsedDays: 4,
      isPartial: true,
    });
    expect(cycle.weeks[4]).toMatchObject({
      weekNumber: 5,
      startDate: "2026-11-23",
      endDate: "2026-11-25",
      dayCount: 3,
    });
  });
});

describe("computeConsumptionIntelligence - hierarquia Categoria/Subcategoria e Parceladas", () => {
  it("aplica herança subcategoria > categoria > Não definido e permite separar compra do mês vs jantar", () => {
    const txs: RawConsumptionTransaction[] = [
      // Mercado > Compra do Mês (subcategoria explicitamente marcada como 'fixed' sobrescrevendo pai 'recurring')
      makeTx({
        id: 1,
        description: "Compra do Mês Atacadão",
        amount: 1400,
        launchDate: "2026-11-02",
        categoryId: 1,
        categoryName: "Mercado",
        categoryDefaultNature: "recurring",
        subcategoryId: 11,
        subcategoryName: "Mercado Geral",
        subcategoryDefaultNature: "fixed",
      }),
      // Mercado > Jantar (subcategoria 'recurring' mesmo com pai 'fixed' ou 'recurring')
      makeTx({
        id: 2,
        description: "Ingredientes Jantar Especial",
        amount: 180,
        launchDate: "2026-11-03",
        categoryId: 1,
        categoryName: "Mercado",
        categoryDefaultNature: "fixed",
        subcategoryId: 12,
        subcategoryName: "Jantar",
        subcategoryDefaultNature: "recurring",
      }),
      // Mercado > Reposição (subcategoria null -> herda categoria pai 'recurring')
      makeTx({
        id: 3,
        description: "Padaria da esquina",
        amount: 45,
        launchDate: "2026-11-04",
        categoryId: 1,
        categoryName: "Mercado",
        categoryDefaultNature: "recurring",
        subcategoryId: 13,
        subcategoryName: "Reposição",
        subcategoryDefaultNature: null,
      }),
      // Categoria e subcategoria ambas null -> padrão Não definido (unclassified), mesmo com nome "Supermercado"
      makeTx({
        id: 4,
        description: "Supermercado Sem Regra",
        amount: 320,
        launchDate: "2026-11-05",
        categoryId: 99,
        categoryName: "Supermercado",
        categoryDefaultNature: null,
        subcategoryId: 990,
        subcategoryName: "Geral",
        subcategoryDefaultNature: null,
      }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    // Apenas id 2 (180) + id 3 (45) entram como consumo recorrente = 225
    expect(res.summary.realizedTotal).toBe(225);
    expect(res.summary.excludedTotals.fixed).toBe(1400);
    expect(res.summary.excludedTotals.unclassified).toBe(320);
    expect(res.summary.excludedTotals.unclassifiedCount).toBe(1);

    const tx1 = res.auditTransactions.find((t) => t.id === 1)!;
    const tx2 = res.auditTransactions.find((t) => t.id === 2)!;
    const tx3 = res.auditTransactions.find((t) => t.id === 3)!;
    const tx4 = res.auditTransactions.find((t) => t.id === 4)!;

    expect(tx1.effectiveNature).toBe("fixed");
    expect(tx2.effectiveNature).toBe("recurring");
    expect(tx3.effectiveNature).toBe("recurring");
    expect(tx4.effectiveNature).toBe("unclassified");
  });

  it("não bloqueia compra de valor alto em subcategoria de consumo (sem trava artificial de anomalia)", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({ id: 1, description: "Mercado", amount: 150, launchDate: "2026-08-03" }),
      makeTx({ id: 2, description: "Mercado", amount: 170, launchDate: "2026-09-03" }),
      makeTx({ id: 3, description: "Mercado", amount: 160, launchDate: "2026-10-03" }),
      makeTx({ id: 4, description: "Mercado", amount: 165, launchDate: "2026-10-10" }),
      // Compra grande R$ 1.800 em subcategoria explicitamente marcada como consumo -> entra normalmente
      makeTx({
        id: 5,
        description: "Supermercado Atacadista",
        amount: 1800,
        launchDate: "2026-11-04",
        subcategoryDefaultNature: "recurring",
      }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    const bigTx = res.auditTransactions.find((t) => t.id === 5)!;
    expect(bigTx.effectiveNature).toBe("recurring");
    expect(bigTx.isAnomalyWarning).toBe(false);
    expect(res.summary.realizedTotal).toBe(1800);
  });

  it("permite que despesa fixa tipada como consumo (ex: assinatura streaming) entre no consumo semanal", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({
        id: 1,
        description: "Netflix",
        amount: 55.9,
        launchDate: "2026-11-03",
        fixedTransactionId: "fixed-stream-1",
        isFixed: true,
        categoryId: 20,
        categoryName: "Assinaturas",
        categoryDefaultNature: "fixed",
        subcategoryId: 201,
        subcategoryName: "Streaming",
        subcategoryDefaultNature: "recurring",
      }),
      makeTx({
        id: 2,
        description: "Aluguel",
        amount: 2200,
        launchDate: "2026-11-05",
        fixedTransactionId: "fixed-rent-1",
        isFixed: true,
        categoryId: 21,
        categoryName: "Moradia",
        categoryDefaultNature: "fixed",
        subcategoryId: 211,
        subcategoryName: "Aluguel",
        subcategoryDefaultNature: null,
      }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    expect(res.summary.realizedTotal).toBe(55.9);
    expect(res.summary.excludedTotals.fixed).toBe(2200);
    expect(res.auditTransactions.find((t) => t.id === 1)?.effectiveNature).toBe("recurring");
    expect(res.auditTransactions.find((t) => t.id === 2)?.effectiveNature).toBe("fixed");
  });

  it("separa compras parceladas automaticamente em 'installment' (sem poluir consumo variável ou pendentes) e herda override manual entre parcelas", () => {
    const txs: RawConsumptionTransaction[] = [
      // Histórico variável recorrente
      makeTx({ id: 1, description: "Supermercado", amount: 500, launchDate: "2026-08-03" }),
      makeTx({ id: 2, description: "Supermercado", amount: 520, launchDate: "2026-09-03" }),
      makeTx({ id: 3, description: "Supermercado", amount: 480, launchDate: "2026-10-03" }),
      makeTx({ id: 4, description: "Supermercado", amount: 500, launchDate: "2026-11-03" }),

      // Compra parcelada em 3x mesmo dentro de categoria 'recurring' -> vai automaticamente para 'installment' (separado!)
      makeTx({
        id: 30,
        type: "credit_card_expense",
        creditCardId: 1,
        description: "Calçados Loja A (2/3)",
        amount: 150,
        launchDate: "2026-10-05",
        categoryId: 1,
        categoryDefaultNature: "recurring",
        installmentCurrent: 2,
        installmentTotal: 3,
      }),
      makeTx({
        id: 31,
        type: "credit_card_expense",
        creditCardId: 1,
        description: "Calçados Loja A (3/3)",
        amount: 150,
        launchDate: "2026-11-05",
        categoryId: 1,
        categoryDefaultNature: "recurring",
        installmentCurrent: 3,
        installmentTotal: 3,
        installmentParentId: 30,
      }),

      // Geladeira 21x com override manual na parcela 1 como 'extraordinary' -> parcela 4 herda 'extraordinary'
      makeTx({
        id: 10,
        type: "credit_card_expense",
        creditCardId: 2,
        description: "Geladeira Brastemp (1/21)",
        amount: 250,
        launchDate: "2026-08-05",
        dueDate: "2026-09-10",
        categoryId: 2,
        categoryName: "Casa",
        categoryDefaultNature: null,
        installmentCurrent: 1,
        installmentTotal: 21,
        persistedNature: "extraordinary",
        persistedSource: "manual",
      }),
      makeTx({
        id: 13,
        type: "credit_card_expense",
        creditCardId: 2,
        description: "Geladeira Brastemp (4/21)",
        amount: 250,
        launchDate: "2026-11-05",
        dueDate: "2026-12-10",
        categoryId: 2,
        categoryName: "Casa",
        categoryDefaultNature: null,
        installmentCurrent: 4,
        installmentTotal: 21,
        installmentParentId: 10,
      }),
    ];

    const manualHistory: ManualClassificationHistoryEntry[] = [
      {
        id: 10,
        description: "Geladeira Brastemp (1/21)",
        categoryId: 2,
        subcategoryId: 10,
        nature: "extraordinary",
        installmentParentId: null,
        parentTransactionId: null,
        installmentTotal: 21,
        type: "credit_card_expense",
        creditCardId: 2,
        accountId: null,
      },
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory,
      categoryBudgets: new Map(),
    });

    // Consumo variável semanal continua exatamente 500 (média 500)
    expect(res.weeks[0].expectedFullMean).toBe(500);
    expect(res.summary.realizedTotal).toBe(500);
    expect(res.summary.excludedTotals.unclassifiedCount).toBe(0);

    // Parcelada automática fica separada em installmentsSummary e excludedTotals.installment
    expect(res.summary.excludedTotals.installment).toBe(150);
    expect(res.installmentsSummary.currentTotal).toBe(150);
    expect(res.installmentsSummary.currentCount).toBe(1);
    expect(res.installmentsSummary.validBaselineCount).toBe(3); // Ago=0, Set=0, Out=150 -> média=50
    expect(res.installmentsSummary.historicalMean).toBe(50);

    const autoInstallment = res.auditTransactions.find((t) => t.id === 31)!;
    expect(autoInstallment.effectiveNature).toBe("installment");

    const inheritedExtra = res.auditTransactions.find((t) => t.id === 13)!;
    expect(inheritedExtra.effectiveNature).toBe("extraordinary");
    expect(inheritedExtra.effectiveSource).toBe("inherited_installment");
  });

  it("usa data da compra (cartão), isola transferências/pagamento/adiantamento negativo de fatura/empréstimo e aplica estorno real", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({ id: 1, description: "Supermercado", amount: 300, launchDate: "2026-10-03" }),
      // Compra no cartão em 04/11 cuja fatura vence só em 10/12 -> entra na Semana 1 de Novembro
      makeTx({
        id: 2,
        type: "credit_card_expense",
        creditCardId: 1,
        description: "Supermercado Carrefour",
        amount: 250,
        launchDate: "2026-11-04",
        dueDate: "2026-12-10",
      }),
      // Pagamento da fatura (transfer) -> NÃO duplica consumo
      makeTx({
        id: 3,
        type: "transfer",
        description: "Pagamento de Fatura - 2026-11",
        amount: 1800,
        launchDate: "2026-11-05",
        categoryId: 5,
        categoryName: "Pagamento de Fatura",
        categoryDefaultNature: null,
      }),
      // Adiantamento de fatura negativo em credit_card_expense -> NÃO pode abater consumo
      makeTx({
        id: 4,
        type: "credit_card_expense",
        creditCardId: 1,
        description: "Adiantamento de Fatura",
        amount: -200,
        launchDate: "2026-11-05",
        categoryId: 5,
        categoryName: "Pagamento de Fatura",
        categoryDefaultNature: null,
      }),
      // Transferência para caixinha -> movimentação financeira
      makeTx({
        id: 5,
        type: "transfer",
        description: "Aporte Caixinha Viagem (Saída)",
        amount: 600,
        launchDate: "2026-11-05",
        categoryId: 6,
        categoryName: "Transferência",
        categoryDefaultNature: null,
      }),
      // Empréstimo -> movimentação financeira
      makeTx({
        id: 6,
        description: "Parcela Empréstimo",
        amount: 400,
        launchDate: "2026-11-05",
        loanId: "loan-uuid-1",
        categoryId: 7,
        categoryName: "Empréstimos",
        categoryDefaultNature: "recurring",
      }),
      // Estorno real em supermercado -> reduz consumo da categoria/semana
      makeTx({
        id: 7,
        type: "credit_card_expense",
        creditCardId: 1,
        description: "Estorno Supermercado Carrefour",
        amount: -50,
        launchDate: "2026-11-06",
        dueDate: "2026-12-10",
      }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    // 250 compra - 50 estorno = 200
    expect(res.summary.realizedTotal).toBe(200);
    expect(res.weeks[0].actualToDate).toBe(200);
    // 1800 (pgto fatura) - 200 (adiantamento negativo) + 600 (caixinha) + 400 (empréstimo) = 2600
    expect(res.summary.excludedTotals.financialMovement).toBe(2600);
  });

  it("semana parcial compara exatamente o mesmo intervalo de dias e projeta restante pelo padrão histórico dos dias restantes", () => {
    const txs: RawConsumptionTransaction[] = [];
    let nextId = 1;
    for (const m of ["2026-08", "2026-09", "2026-10"]) {
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 100, launchDate: `${m}-03` }));
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 120, launchDate: `${m}-09` }));
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 280, launchDate: `${m}-13` }));
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 200, launchDate: `${m}-17` }));
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 200, launchDate: `${m}-24` }));
      txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 50, launchDate: `${m}-29` }));
    }

    txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 100, launchDate: "2026-11-03" }));
    txs.push(makeTx({ id: nextId++, description: "Mercado", amount: 120, launchDate: "2026-11-10" }));

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-11",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    const week2 = res.weeks[1];
    expect(week2.state).toBe("in_progress");
    expect(week2.isPartial).toBe(true);
    expect(week2.elapsedDays).toBe(4);
    expect(week2.actualToDate).toBe(120);
    expect(week2.expectedToDateMean).toBe(120);
    expect(week2.differenceAmount).toBe(0);
    expect(week2.status).toBe("within_expected");
    expect(week2.projectedRemaining).toBe(280);
    expect(week2.projectedTotal).toBe(400);
    expect(res.summary.projectedClosing).toBe(950);
  });

  it("identifica semana acima do comportamento histórico respeitando variância (categoria estável vs volátil)", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({ id: 1, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 195, launchDate: "2026-08-03" }),
      makeTx({ id: 2, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 200, launchDate: "2026-09-03" }),
      makeTx({ id: 3, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 205, launchDate: "2026-10-03" }),
      makeTx({ id: 4, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 360, launchDate: "2026-11-03" }),

      makeTx({ id: 5, categoryId: 2, categoryName: "Alimentação", subcategoryName: "Restaurante", description: "Restaurante", amount: 100, launchDate: "2026-08-04" }),
      makeTx({ id: 6, categoryId: 2, categoryName: "Alimentação", subcategoryName: "Restaurante", description: "Restaurante", amount: 300, launchDate: "2026-09-04" }),
      makeTx({ id: 7, categoryId: 2, categoryName: "Alimentação", subcategoryName: "Restaurante", description: "Restaurante", amount: 500, launchDate: "2026-10-04" }),
      makeTx({ id: 8, categoryId: 2, categoryName: "Alimentação", subcategoryName: "Restaurante", description: "Restaurante", amount: 360, launchDate: "2026-11-04" }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    const stableCat = res.categories.find((c) => c.categoryId === 1)!;
    const volatileCat = res.categories.find((c) => c.categoryId === 2)!;

    expect(stableCat.status).toBe("well_above_expected");
    expect(volatileCat.status).toBe("within_expected");
  });

  it("meses sem histórico não entram como zero e categoria sem histórico usa orçamento provisório com confiança insuficiente", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({ id: 1, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 400, launchDate: "2026-10-03" }),
      makeTx({ id: 2, categoryId: 1, categoryName: "Supermercado", description: "Supermercado", amount: 420, launchDate: "2026-11-03" }),
      makeTx({ id: 3, categoryId: 9, categoryName: "Farmácia", subcategoryName: "Geral", description: "Drogasil", amount: 80, launchDate: "2026-11-04" }),
    ];

    const budgets = new Map<number, number>([
      [1, 1500],
      [9, 300],
    ]);

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-07",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: budgets,
    });

    expect(res.summary.validBaselineCount).toBe(1);
    expect(res.weeks[0].expectedFullMean).toBe(400);
    expect(res.summary.overallConfidence).toBe("low");
    expect(res.scenarios.hasStatisticalBasis).toBe(false);
    expect(res.scenarios.optimistic).toBeNull();
    expect(res.scenarios.pessimistic).toBeNull();

    const pharmacy = res.categories.find((c) => c.categoryId === 9)!;
    expect(pharmacy.referenceSource).toBe("provisional_budget");
    expect(pharmacy.confidence).toBe("insufficient");
    expect(pharmacy.expectedCompetencyTotal).toBe(300);
  });

  it("gera cenários Otimista <= Provável <= Pessimista com base estatística quando há >= 2 meses válidos", () => {
    const txs: RawConsumptionTransaction[] = [
      makeTx({ id: 1, description: "Supermercado", amount: 300, launchDate: "2026-08-03" }),
      makeTx({ id: 2, description: "Supermercado", amount: 300, launchDate: "2026-08-18" }),
      makeTx({ id: 3, description: "Supermercado", amount: 400, launchDate: "2026-09-03" }),
      makeTx({ id: 4, description: "Supermercado", amount: 500, launchDate: "2026-09-18" }),
      makeTx({ id: 5, description: "Supermercado", amount: 350, launchDate: "2026-10-03" }),
      makeTx({ id: 6, description: "Supermercado", amount: 400, launchDate: "2026-10-18" }),
      makeTx({ id: 7, description: "Supermercado", amount: 420, launchDate: "2026-11-03" }),
    ];

    const res = computeConsumptionIntelligence({
      targetMonth: "2026-11",
      closingDay: 31,
      referenceToday: "2026-11-10",
      transactions: txs,
      manualHistory: [],
      categoryBudgets: new Map(),
    });

    expect(res.scenarios.hasStatisticalBasis).toBe(true);
    expect(res.scenarios.optimistic).not.toBeNull();
    expect(res.scenarios.probable).not.toBeNull();
    expect(res.scenarios.pessimistic).not.toBeNull();
    expect(res.scenarios.optimistic!).toBeLessThanOrEqual(res.scenarios.probable!);
    expect(res.scenarios.probable!).toBeLessThanOrEqual(res.scenarios.pessimistic!);
  });
});
