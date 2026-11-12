import {
  buildCategoryUsageCountSql,
  buildCategoryUsageOrderBy,
  countCategoryUsage,
  countSubcategoryUsage,
  createCategoryUsageComparator,
  orderByMostUsedCategory,
  orderByMostUsedCategorySql,
  sortCategoriesByUsage,
  type CategoryUsageItem,
} from "@/lib/category-utils";
import { describe, expect, it } from "vitest";

describe("Category Utils - orderByMostUsedCategory & In-Memory Sorting", () => {
  const mockCategories: CategoryUsageItem[] = [
    { id: 1, name: "Transporte" },
    { id: 2, name: "Alimentação" },
    { id: 3, name: "Lazer" },
    { id: 4, name: "Saúde" },
    { id: 5, name: "Educação" },
  ];

  it("deve contar corretamente o uso das categorias a partir de transações", () => {
    const transactions = [
      { categoryId: 2 },
      { categoryId: 2 },
      { categoryId: 1 },
      { categoryId: 3 },
      { categoryId: 2 },
      { categoryId: null },
      { categoryId: undefined },
    ];

    const counts = countCategoryUsage(transactions);
    expect(counts.get(2)).toBe(3);
    expect(counts.get(1)).toBe(1);
    expect(counts.get(3)).toBe(1);
    expect(counts.get(4)).toBeUndefined();
  });

  it("deve contar corretamente o uso das subcategorias", () => {
    const transactions = [
      { subcategoryId: 10 },
      { subcategoryId: 10 },
      { subcategoryId: 20 },
      { subcategoryId: null },
    ];

    const counts = countSubcategoryUsage(transactions);
    expect(counts.get(10)).toBe(2);
    expect(counts.get(20)).toBe(1);
    expect(counts.get(30)).toBeUndefined();
  });

  it("deve ordenar categorias da mais utilizada para a menos utilizada usando lista de transações", () => {
    const transactions = [
      { categoryId: 3 }, // Lazer: 1
      { categoryId: 2 }, // Alimentação: 3
      { categoryId: 2 },
      { categoryId: 4 }, // Saúde: 2
      { categoryId: 4 },
      { categoryId: 2 },
    ];

    const sorted = sortCategoriesByUsage(mockCategories, transactions);

    expect(sorted.map((c) => c.id)).toEqual([
      2, // Alimentação (3 usos)
      4, // Saúde (2 usos)
      3, // Lazer (1 uso)
      5, // Educação (0 usos, ordem alfabética "Educação" antes de "Transporte")
      1, // Transporte (0 usos)
    ]);
  });

  it("orderByMostUsedCategory deve ser um alias funcional de sortCategoriesByUsage", () => {
    const usageMap = new Map<number | string, number>([
      [1, 10],
      [2, 50],
      [3, 5],
    ]);

    const sorted = orderByMostUsedCategory(mockCategories, usageMap);

    expect(sorted[0].id).toBe(2); // Alimentação: 50
    expect(sorted[1].id).toBe(1); // Transporte: 10
    expect(sorted[2].id).toBe(3); // Lazer: 5
  });

  it("deve aceitar Record<string, number> como fonte de contagem", () => {
    const usageRecord: Record<string, number> = {
      "1": 5,
      "2": 15,
      "3": 2,
    };

    const sorted = sortCategoriesByUsage(mockCategories, usageRecord);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
    expect(sorted[2].id).toBe(3);
  });

  it("deve desempatar por ordem alfabética (nome) em caso de mesma frequência", () => {
    const usageMap = new Map<number | string, number>([
      [1, 5], // Transporte
      [3, 5], // Lazer
    ]);

    const sorted = sortCategoriesByUsage(mockCategories, usageMap);
    // Categorias com 5 usos: Lazer e Transporte. Lazer vem antes por ordem alfabética.
    expect(sorted[0].name).toBe("Lazer");
    expect(sorted[1].name).toBe("Transporte");
  });

  it("deve suportar ordenação ascendente se configurado", () => {
    const usageMap = new Map<number | string, number>([
      [1, 10],
      [2, 2],
      [3, 5],
    ]);

    const sorted = sortCategoriesByUsage(mockCategories, usageMap, { direction: "asc" });
    // Menos usada primeiro entre as que têm contagem (ou zero usos antes)
    const filteredOnlyActive = sorted.filter((c) => [1, 2, 3].includes(c.id as number));
    expect(filteredOnlyActive.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it("createCategoryUsageComparator pode ser usado diretamente com .sort()", () => {
    const usageMap = new Map<number | string, number>([
      [1, 2],
      [4, 8],
    ]);

    const comparator = createCategoryUsageComparator(usageMap);
    const sorted = [...mockCategories].sort(comparator);

    expect(sorted[0].id).toBe(4);
    expect(sorted[1].id).toBe(1);
  });

  it("não deve mutar o array original em sortCategoriesByUsage", () => {
    const original = [...mockCategories];
    const transactions = [{ categoryId: 1 }, { categoryId: 1 }];

    const sorted = sortCategoriesByUsage(original, transactions);

    expect(original[0].id).toBe(1);
    expect(sorted[0].id).toBe(1);
    expect(original).not.toBe(sorted);
  });

  it("deve ordenar itens que possuem propriedade usageCount diretamente", () => {
    const categoriesWithCount = [
      { id: 1, name: "Transporte", usageCount: 2 },
      { id: 2, name: "Alimentação", usageCount: 20 },
      { id: 3, name: "Lazer", usageCount: 8 },
    ];

    const sorted = orderByMostUsedCategory(categoriesWithCount);
    expect(sorted.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it("deve preservar a ordem inicial quando usageSource não for passado e não houver usageCount", () => {
    const items = [
      { id: 3, name: "Zebra" },
      { id: 1, name: "Abelha" },
      { id: 2, name: "Macaco" },
    ];

    const sorted = orderByMostUsedCategory(items);
    expect(sorted.map((c) => c.id)).toEqual([3, 1, 2]);
  });
});

describe("Category Utils - Drizzle SQL Order By builders", () => {
  it("buildCategoryUsageCountSql deve gerar SQL válido sem userId", () => {
    const sqlExpr = buildCategoryUsageCountSql();
    expect(sqlExpr).toBeDefined();
  });

  it("buildCategoryUsageCountSql deve incluir cláusula de userId quando fornecido", () => {
    const sqlExpr = buildCategoryUsageCountSql({ userId: "user-123" });
    expect(sqlExpr).toBeDefined();
  });

  it("buildCategoryUsageOrderBy deve retornar cláusulas SQL de ordenação por padrão com desempate por nome", () => {
    const clauses = buildCategoryUsageOrderBy();
    expect(clauses).toHaveLength(2);
  });

  it("buildCategoryUsageOrderBy sem desempate de nome deve retornar apenas 1 cláusula", () => {
    const clauses = buildCategoryUsageOrderBy({ withNameTieBreaker: false });
    expect(clauses).toHaveLength(1);
  });

  it("orderByMostUsedCategorySql deve ser o alias do builder SQL", () => {
    expect(orderByMostUsedCategorySql).toBe(buildCategoryUsageOrderBy);
  });
});
