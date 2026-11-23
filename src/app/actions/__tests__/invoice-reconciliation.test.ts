import { auth } from "@/auth";
import { analyzeInvoiceReconciliation, applyInvoiceReconciliation } from "@/app/actions/invoice-reconciliation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent, mockGetGenerativeModel, mockDb, mockTx } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));

  const mockTx = {
    insert: vi.fn(),
    delete: vi.fn(),
    query: {
      categories: { findFirst: vi.fn() },
      subcategories: { findFirst: vi.fn() },
    },
  };

  const mockDb = {
    query: {
      creditCards: { findFirst: vi.fn() },
      transactions: { findMany: vi.fn() },
      categories: { findMany: vi.fn() },
    },
    transaction: vi.fn((callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  };

  return { mockGenerateContent, mockGetGenerativeModel, mockDb, mockTx };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel;
    },
    SchemaType: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      NUMBER: "NUMBER",
      INTEGER: "INTEGER",
    },
  };
});

describe("invoice-reconciliation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("rejeita análise quando usuário não está autenticado", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await analyzeInvoiceReconciliation({
      creditCardId: 1,
      competencyMonth: "2026-11",
      file: { fileType: "csv", text: "data,desc,valor\n2026-11-05,Uber,25.00" },
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain("autenticado");
    }
  });

  it("analisa fatura CSV, sanitiza IDs inválidos e classifica transações omitidas em toRemove", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    mockDb.query.creditCards.findFirst.mockResolvedValue({
      id: 1,
      userId: "user-1",
      name: "Nubank",
      closingDay: 25,
      dueDay: 5,
    });
    mockDb.query.transactions.findMany.mockResolvedValue([
      {
        id: 10,
        description: "Almoço iFood",
        amount: "45.90",
        launchDate: "2026-11-02",
        dueDate: "2026-12-05",
        installmentCurrent: null,
        installmentTotal: null,
        category: { name: "Alimentação" },
        subcategory: null,
      },
      {
        id: 11,
        description: "Compra duplicada",
        amount: "30.00",
        launchDate: "2026-11-03",
        dueDate: "2026-12-05",
        installmentCurrent: null,
        installmentTotal: null,
        category: { name: "Outros" },
        subcategory: null,
      },
    ]);
    mockDb.query.categories.findMany.mockResolvedValue([
      {
        id: 100,
        name: "Alimentação",
        subcategories: [{ id: 200, name: "Restaurante" }],
      },
    ]);

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            invoiceTotal: 145.9,
            matched: [
              {
                appTransactionId: 10,
                bankDescription: "IFD*RESTAURANTE",
                bankDate: "2026-11-03",
                bankAmount: 45.9,
                confidence: "high",
                reason: "Mesmo valor R$ 45,90 e contexto iFood",
              },
              {
                appTransactionId: 9999, // ID inexistente deve ser descartado
                bankDescription: "Fantasma",
                bankDate: "2026-11-04",
                bankAmount: 10,
                confidence: "low",
                reason: "Invalido",
              },
            ],
            toAdd: [
              {
                description: "Amazon Brasil",
                amount: 100.0,
                date: "2026-11-10",
                suggestedCategoryId: 100,
                suggestedSubcategoryId: 999, // subcategoria inválida deve virar null
                reason: "Presente na fatura e ausente no app",
              },
            ],
            toRemove: [], // ID 11 foi omitido pela IA e deve entrar automaticamente
          }),
      },
    });

    const res = await analyzeInvoiceReconciliation({
      creditCardId: 1,
      competencyMonth: "2026-11",
      file: { fileType: "csv", text: "data,desc,valor\n2026-11-03,IFD*RESTAURANTE,45.90\n2026-11-10,AMAZON,100.00" },
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.invoiceTotal).toBe(145.9);
      expect(res.data.appTotal).toBe(75.9);
      expect(res.data.matched).toHaveLength(1);
      expect(res.data.matched[0].appTransactionId).toBe(10);
      expect(res.data.toAdd).toHaveLength(1);
      expect(res.data.toAdd[0].suggestedCategoryId).toBe(100);
      expect(res.data.toAdd[0].suggestedSubcategoryId).toBeNull();
      expect(res.data.toRemove).toHaveLength(1);
      expect(res.data.toRemove[0].appTransactionId).toBe(11);
    }
  });

  it("envia PDF como inlineData application/pdf para o Gemini", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    mockDb.query.creditCards.findFirst.mockResolvedValue({
      id: 1,
      userId: "user-1",
      name: "Nubank",
      closingDay: 25,
      dueDay: 5,
    });
    mockDb.query.transactions.findMany.mockResolvedValue([]);
    mockDb.query.categories.findMany.mockResolvedValue([]);
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ invoiceTotal: 0, matched: [], toAdd: [], toRemove: [] }),
      },
    });

    const res = await analyzeInvoiceReconciliation({
      creditCardId: 1,
      competencyMonth: "2026-11",
      file: { fileType: "pdf", base64: "JVBERi0xLjQ=" },
    });

    expect(res.success).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQ=" },
        }),
      ]),
    );
  });

  it("aplica conciliação inserindo novas despesas e excluindo sobras em transação única", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    mockDb.query.creditCards.findFirst.mockResolvedValue({
      id: 1,
      userId: "user-1",
      name: "Nubank",
      closingDay: 25,
      dueDay: 5,
    });

    mockTx.query.categories.findFirst.mockResolvedValue({ id: 50, name: "Outros" });
    mockTx.query.subcategories.findFirst.mockResolvedValue({ id: 51, name: "Geral" });

    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    mockTx.insert.mockReturnValue({ values: mockInsertValues });

    const mockDeleteReturning = vi.fn().mockResolvedValue([{ id: 11 }]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    mockTx.delete.mockReturnValue({ where: mockDeleteWhere });

    const res = await applyInvoiceReconciliation({
      creditCardId: 1,
      competencyMonth: "2026-11",
      defaultStatus: "pending",
      additions: [
        {
          description: "Amazon Brasil",
          amount: 100,
          date: "2026-11-10",
          categoryId: null,
          subcategoryId: null,
        },
      ],
      removalIds: [11],
    });

    expect(res).toEqual({ success: true, addedCount: 1, removedCount: 1 });
    expect(mockTx.insert).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "user-1",
        type: "credit_card_expense",
        creditCardId: 1,
        categoryId: 50,
        subcategoryId: 51,
        amount: "100.00",
        description: "Amazon Brasil",
        launchDate: "2026-11-10",
        dueDate: "2026-11-05",
        competencyMonth: "2026-11",
        invoiceMonth: "2026-11",
        status: "pending",
      }),
    ]);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
  });
});
