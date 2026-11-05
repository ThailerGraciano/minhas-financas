import {
  getCreditCard,
  getCreditCards,
  getInvoiceSummary,
  payFullInvoice,
  prepayInvoice,
} from "@/app/actions/credit-cards";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock do auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock do next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock do db
vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      query: {
        creditCards: {
          findFirst: vi.fn(),
        },
        transactions: {
          findMany: vi.fn(),
        },
        categories: {
          findFirst: vi.fn(),
        },
        subcategories: {
          findFirst: vi.fn(),
        },
      },
      transaction: vi.fn((callback) => callback(mockTx)),
    },
  };
});

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {
    categories: {
      findFirst: vi.fn(),
    },
    subcategories: {
      findFirst: vi.fn(),
    },
  },
};

type MockFn = ReturnType<typeof vi.fn>;

describe("Credit Cards Server Actions - Security and Invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve bloquear acesso caso usuário não esteja autenticado", async () => {
    const { auth } = await import("@/auth");
    (auth as unknown as MockFn).mockResolvedValue(null);

    await expect(getCreditCards()).rejects.toThrow("Unauthorized");
    await expect(getCreditCard(1)).rejects.toThrow("Unauthorized");
    await expect(getInvoiceSummary(1, "2026-08")).rejects.toThrow("Unauthorized");
  });

  it("deve verificar se o cartão pertence ao usuário autenticado (Multi-tenancy)", async () => {
    const { auth } = await import("@/auth");
    const { db } = await import("@/db");
    (auth as unknown as MockFn).mockResolvedValue({ user: { id: "user-123" } });
    (db.query.creditCards.findFirst as unknown as MockFn).mockResolvedValue(null);

    await expect(getInvoiceSummary(99, "2026-08")).rejects.toThrow("Cartão não encontrado");
  });

  it("payFullInvoice deve falhar graciosamente se não houver valor pendente na fatura", async () => {
    const { auth } = await import("@/auth");
    const { db } = await import("@/db");
    (auth as unknown as MockFn).mockResolvedValue({ user: { id: "user-123" } });

    // Cartão existe
    (db.query.creditCards.findFirst as unknown as MockFn).mockResolvedValue({
      id: 10,
      userId: "user-123",
      closingDay: 20,
      dueDay: 28,
    });

    // Nenhuma transação pendente
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await payFullInvoice(10, "2026-08", 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Não há valor pendente");
  });

  it("prepayInvoice deve impedir adiantamento maior do que o valor pendente", async () => {
    const { auth } = await import("@/auth");
    const { db } = await import("@/db");
    (auth as unknown as MockFn).mockResolvedValue({ user: { id: "user-123" } });

    (db.query.creditCards.findFirst as unknown as MockFn).mockResolvedValue({
      id: 10,
      userId: "user-123",
      closingDay: 20,
      dueDay: 28,
    });

    // Fatura possui 100 pendente
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ amount: "100.00", status: "pending" }]),
      }),
    });

    const result = await prepayInvoice(10, "2026-08", 1, 250, "2026-08-15");
    expect(result.success).toBe(false);
    expect(result.error).toContain("não pode ser maior que o saldo devedor");
  });
});
