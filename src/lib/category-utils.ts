import { categories } from "@/db/schema";
import { asc, desc, sql, type SQL } from "drizzle-orm";

export interface CategoryUsageItem {
  id: number | string;
  name?: string | null;
  usageCount?: number;
}

export interface TransactionCategoryRef {
  categoryId?: number | string | null;
}

export interface TransactionSubcategoryRef {
  subcategoryId?: number | string | null;
}

export type CategoryUsageCounts = Map<number | string, number> | Record<string, number> | Record<number, number>;

export type CategorySortDirection = "asc" | "desc";

export interface CategorySortOptions {
  direction?: CategorySortDirection;
  tieBreaker?: "name" | "none";
}

/**
 * Type guard para verificar se o parâmetro é um array de transações.
 */
function isTransactionArray(
  source: CategoryUsageCounts | readonly TransactionCategoryRef[],
): source is readonly TransactionCategoryRef[] {
  return Array.isArray(source);
}

/**
 * Calcula a frequência de uso de cada categoria a partir de uma lista de transações.
 */
export function countCategoryUsage(transactionsList: readonly TransactionCategoryRef[]): Map<number | string, number> {
  const counts = new Map<number | string, number>();
  for (const tx of transactionsList) {
    if (tx.categoryId !== null && tx.categoryId !== undefined) {
      const current = counts.get(tx.categoryId) ?? 0;
      counts.set(tx.categoryId, current + 1);
    }
  }
  return counts;
}

/**
 * Calcula a frequência de uso de cada subcategoria a partir de uma lista de transações.
 */
export function countSubcategoryUsage(
  transactionsList: readonly TransactionSubcategoryRef[],
): Map<number | string, number> {
  const counts = new Map<number | string, number>();
  for (const tx of transactionsList) {
    if (tx.subcategoryId !== null && tx.subcategoryId !== undefined) {
      const current = counts.get(tx.subcategoryId) ?? 0;
      counts.set(tx.subcategoryId, current + 1);
    }
  }
  return counts;
}

/**
 * Normaliza a fonte de contagem para uma função que retorna a contagem de uso dado um item.
 */
function resolveCountAccessor(
  usageSource?: CategoryUsageCounts | readonly TransactionCategoryRef[],
): (item: CategoryUsageItem) => number {
  if (usageSource) {
    if (isTransactionArray(usageSource)) {
      const counts = countCategoryUsage(usageSource);
      return (item: CategoryUsageItem) =>
        counts.get(item.id) ?? counts.get(String(item.id)) ?? counts.get(Number(item.id)) ?? item.usageCount ?? 0;
    }

    if (usageSource instanceof Map) {
      const map = usageSource;
      return (item: CategoryUsageItem) =>
        map.get(item.id) ?? map.get(String(item.id)) ?? map.get(Number(item.id)) ?? item.usageCount ?? 0;
    }

    const recordSource: Record<string, number> = usageSource;
    return (item: CategoryUsageItem) => {
      const keyStr = String(item.id);
      return recordSource[keyStr] ?? item.usageCount ?? 0;
    };
  }

  return (item: CategoryUsageItem) => item.usageCount ?? 0;
}

/**
 * Cria uma função comparadora para ordenação por categoria mais utilizada.
 * Compatível diretamente com o método `.sort()` de arrays em JavaScript/TypeScript.
 */
export function createCategoryUsageComparator<T extends CategoryUsageItem>(
  usageSource?: CategoryUsageCounts | readonly TransactionCategoryRef[],
  options?: CategorySortOptions,
): (a: T, b: T) => number {
  const getCount = resolveCountAccessor(usageSource);
  const direction = options?.direction ?? "desc";
  const tieBreaker = options?.tieBreaker ?? (usageSource ? "name" : "none");

  return (a: T, b: T): number => {
    const countA = getCount(a);
    const countB = getCount(b);

    if (countA !== countB) {
      return direction === "desc" ? countB - countA : countA - countB;
    }

    if (tieBreaker === "name") {
      const nameA = a.name ?? "";
      const nameB = b.name ?? "";
      return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
    }

    return 0;
  };
}

/**
 * Ordena um array de categorias pela frequência de uso (mais utilizada primeiro por padrão).
 * Retorna um novo array sem mutar a lista original.
 */
export function sortCategoriesByUsage<T extends CategoryUsageItem>(
  categoriesList: readonly T[],
  usageSource?: CategoryUsageCounts | readonly TransactionCategoryRef[],
  options?: CategorySortOptions,
): T[] {
  const comparator = createCategoryUsageComparator<T>(usageSource, options);
  return [...categoriesList].sort(comparator);
}

/**
 * Forma de Order By que ordena a categoria mais utilizada (convenience alias).
 */
export function orderByMostUsedCategory<T extends CategoryUsageItem>(
  categoriesList: readonly T[],
  usageSource?: CategoryUsageCounts | readonly TransactionCategoryRef[],
  options?: CategorySortOptions,
): T[] {
  return sortCategoriesByUsage(categoriesList, usageSource, options);
}

/**
 * Constrói a subquery SQL do Drizzle para contar transações vinculadas a cada categoria.
 * Usa identificadores explícitos (transactions.category_id e "categories"."id")
 * para evitar que o compilador de queries relacionais do Drizzle remapeie as colunas da tabela de transações
 * para a tabela raiz da consulta ("categories").
 */
export function buildCategoryUsageCountSql(options?: { userId?: string }): SQL<number> {
  if (options?.userId) {
    return sql<number>`(
      SELECT count(*)
      FROM transactions
      WHERE transactions.category_id = "categories"."id"
        AND transactions.user_id = ${options.userId}
    )`;
  }

  return sql<number>`(
    SELECT count(*)
    FROM transactions
    WHERE transactions.category_id = "categories"."id"
  )`;
}

/**
 * Cláusula de Order By do Drizzle ORM para ordenar categorias pela mais utilizada no banco de dados.
 * Retorna as expressões SQL para passar em `.orderBy(...)` em queries Drizzle.
 */
export function buildCategoryUsageOrderBy(options?: {
  direction?: CategorySortDirection;
  userId?: string;
  withNameTieBreaker?: boolean;
}): SQL[] {
  const direction = options?.direction ?? "desc";
  const countSql = buildCategoryUsageCountSql({ userId: options?.userId });
  const usageOrder = direction === "desc" ? desc(countSql) : asc(countSql);

  if (options?.withNameTieBreaker !== false) {
    return [usageOrder, asc(categories.name)];
  }

  return [usageOrder];
}

/**
 * Alias semântico para a cláusula Drizzle SQL de order by da categoria mais utilizada.
 */
export const orderByMostUsedCategorySql = buildCategoryUsageOrderBy;
