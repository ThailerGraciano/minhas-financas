"use server";

import { asc, sql } from "drizzle-orm";
import packageJson from "../../../package.json";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  accounts,
  allocationRules,
  batchLogs,
  budgetMonthConfigs,
  budgets,
  categories,
  creditCards,
  fixedTransactionOverrides,
  fixedTransactions,
  importLogs,
  loans,
  marketItems,
  marketReceipts,
  marketReceiptTransactions,
  settings,
  subcategories,
  transactions,
  users,
} from "@/db/schema";
import {
  BACKUP_TABLE_CATALOG,
  type BackupTableName,
  buildSqlBackup,
  type DatabaseBackupSnapshot,
} from "@/lib/backup-sql";

const SUPABASE_FREE_LIMIT_BYTES = 500 * 1024 * 1024;

export interface TableTechnicalStat {
  tableName: BackupTableName;
  label: string;
  rowCount: number;
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  hasSerialId: boolean;
}

export interface TechnicalOverviewData {
  appVersion: string;
  nextVersion: string;
  nodeVersion: string;
  postgresVersionShort: string;
  postgresVersionFull: string;
  databaseName: string;
  providerLabel: string;
  status: "online";
  latencyMs: number;
  checkedAt: string;
  supabaseFreeLimitBytes: number;
  databaseTotalBytes: number;
  publicTablesTotalBytes: number;
  publicTablesDataBytes: number;
  publicTablesIndexBytes: number;
  totalRecords: number;
  tables: TableTechnicalStat[];
}

export type TechnicalOverviewResult =
  | { success: true; data: TechnicalOverviewData }
  | { success: false; error: string };

export type SqlBackupActionResult =
  | {
      success: true;
      filename: string;
      sqlContent: string;
      sizeBytes: number;
      totalRows: number;
      tableCount: number;
      generatedAt: string;
    }
  | { success: false; error: string };

interface DbMetaRow extends Record<string, unknown> {
  version: string;
  database_name: string;
  total_bytes: string | number | null;
}

interface TableSizeRow extends Record<string, unknown> {
  table_name: string;
  total_bytes: string | number | null;
  table_bytes: string | number | null;
  index_bytes: string | number | null;
}

interface TableCountRow extends Record<string, unknown> {
  table_name: string;
  row_count: string | number | null;
}

interface VersionRow extends Record<string, unknown> {
  version: string;
}

function toSafeNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function extractPostgresShortVersion(fullVersion: string): string {
  const match = fullVersion.match(/PostgreSQL\s+[\d.]+/i);
  return match ? match[0] : "PostgreSQL";
}

function detectDatabaseProviderLabel(): string {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return "PostgreSQL";
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    if (hostname.includes("supabase")) {
      return "Supabase PostgreSQL";
    }
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "PostgreSQL Local";
    }
    return "PostgreSQL";
  } catch {
    return "PostgreSQL";
  }
}

function isNextDynamicUsageError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: unknown }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

export async function getTechnicalOverview(): Promise<TechnicalOverviewResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado." };
    }

    const startedAt = performance.now();

    const [metaRows, sizeRows, countRows] = await Promise.all([
      db.execute<DbMetaRow>(sql`
        SELECT
          version() AS version,
          current_database() AS database_name,
          pg_database_size(current_database())::bigint AS total_bytes
      `),
      db.execute<TableSizeRow>(sql`
        SELECT
          c.relname AS table_name,
          pg_total_relation_size(c.oid)::bigint AS total_bytes,
          pg_relation_size(c.oid)::bigint AS table_bytes,
          pg_indexes_size(c.oid)::bigint AS index_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
      `),
      db.execute<TableCountRow>(sql`
        SELECT 'users' AS table_name, COUNT(*)::int AS row_count FROM "public"."users"
        UNION ALL SELECT 'settings', COUNT(*)::int FROM "public"."settings"
        UNION ALL SELECT 'accounts', COUNT(*)::int FROM "public"."accounts"
        UNION ALL SELECT 'categories', COUNT(*)::int FROM "public"."categories"
        UNION ALL SELECT 'subcategories', COUNT(*)::int FROM "public"."subcategories"
        UNION ALL SELECT 'credit_cards', COUNT(*)::int FROM "public"."credit_cards"
        UNION ALL SELECT 'loans', COUNT(*)::int FROM "public"."loans"
        UNION ALL SELECT 'allocation_rules', COUNT(*)::int FROM "public"."allocation_rules"
        UNION ALL SELECT 'fixed_transactions', COUNT(*)::int FROM "public"."fixed_transactions"
        UNION ALL SELECT 'fixed_transaction_overrides', COUNT(*)::int FROM "public"."fixed_transaction_overrides"
        UNION ALL SELECT 'transactions', COUNT(*)::int FROM "public"."transactions"
        UNION ALL SELECT 'market_receipts', COUNT(*)::int FROM "public"."market_receipts"
        UNION ALL SELECT 'market_items', COUNT(*)::int FROM "public"."market_items"
        UNION ALL SELECT 'market_receipt_transactions', COUNT(*)::int FROM "public"."market_receipt_transactions"
        UNION ALL SELECT 'budgets', COUNT(*)::int FROM "public"."budgets"
        UNION ALL SELECT 'budget_month_configs', COUNT(*)::int FROM "public"."budget_month_configs"
        UNION ALL SELECT 'batch_logs', COUNT(*)::int FROM "public"."batch_logs"
        UNION ALL SELECT 'import_logs', COUNT(*)::int FROM "public"."import_logs"
      `),
    ]);

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));

    const meta = metaRows[0];
    const postgresVersionFull = meta?.version ?? "PostgreSQL";
    const postgresVersionShort = extractPostgresShortVersion(postgresVersionFull);
    const databaseName = meta?.database_name ?? "postgres";

    const sizeByTable = new Map<string, { totalBytes: number; tableBytes: number; indexBytes: number }>();
    for (const row of sizeRows) {
      sizeByTable.set(row.table_name, {
        totalBytes: toSafeNumber(row.total_bytes),
        tableBytes: toSafeNumber(row.table_bytes),
        indexBytes: toSafeNumber(row.index_bytes),
      });
    }

    const countByTable = new Map<string, number>();
    for (const row of countRows) {
      countByTable.set(row.table_name, toSafeNumber(row.row_count));
    }

    const tables: TableTechnicalStat[] = BACKUP_TABLE_CATALOG.map((item) => {
      const sizes = sizeByTable.get(item.tableName) ?? { totalBytes: 0, tableBytes: 0, indexBytes: 0 };
      const rowCount = countByTable.get(item.tableName) ?? 0;
      return {
        tableName: item.tableName,
        label: item.label,
        rowCount,
        totalBytes: sizes.totalBytes,
        tableBytes: sizes.tableBytes,
        indexBytes: sizes.indexBytes,
        hasSerialId: item.hasSerialId,
      };
    }).sort((a, b) => b.totalBytes - a.totalBytes || b.rowCount - a.rowCount);

    const publicTablesTotalBytes = tables.reduce((acc, table) => acc + table.totalBytes, 0);
    const publicTablesDataBytes = tables.reduce((acc, table) => acc + table.tableBytes, 0);
    const publicTablesIndexBytes = tables.reduce((acc, table) => acc + table.indexBytes, 0);
    const totalRecords = tables.reduce((acc, table) => acc + table.rowCount, 0);
    const rawDatabaseBytes = toSafeNumber(meta?.total_bytes);
    const databaseTotalBytes = rawDatabaseBytes > 0 ? rawDatabaseBytes : publicTablesTotalBytes;

    return {
      success: true,
      data: {
        appVersion: packageJson.version,
        nextVersion: packageJson.dependencies.next.replace(/^[\^~]/, ""),
        nodeVersion: process.version,
        postgresVersionShort,
        postgresVersionFull,
        databaseName,
        providerLabel: detectDatabaseProviderLabel(),
        status: "online",
        latencyMs,
        checkedAt: new Date().toISOString(),
        supabaseFreeLimitBytes: SUPABASE_FREE_LIMIT_BYTES,
        databaseTotalBytes,
        publicTablesTotalBytes,
        publicTablesDataBytes,
        publicTablesIndexBytes,
        totalRecords,
        tables,
      },
    };
  } catch (error) {
    if (isNextDynamicUsageError(error)) {
      throw error;
    }
    console.error("Error fetching technical overview:", error);
    return {
      success: false,
      error: "Não foi possível carregar as métricas técnicas do banco de dados.",
    };
  }
}

export async function generateSqlBackup(): Promise<SqlBackupActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado." };
    }

    const { snapshot, postgresVersion } = await db.transaction(
      async (tx) => {
        const versionRows = await tx.execute<VersionRow>(sql`SELECT version() AS version`);
        const userRows = await tx.select().from(users).orderBy(asc(users.id));
        const settingRows = await tx.select().from(settings).orderBy(asc(settings.id));
        const accountRows = await tx.select().from(accounts).orderBy(asc(accounts.id));
        const categoryRows = await tx.select().from(categories).orderBy(asc(categories.id));
        const subcategoryRows = await tx.select().from(subcategories).orderBy(asc(subcategories.id));
        const creditCardRows = await tx.select().from(creditCards).orderBy(asc(creditCards.id));
        const loanRows = await tx.select().from(loans).orderBy(asc(loans.id));
        const allocationRuleRows = await tx.select().from(allocationRules).orderBy(asc(allocationRules.id));
        const fixedTransactionRows = await tx.select().from(fixedTransactions).orderBy(asc(fixedTransactions.id));
        const fixedOverrideRows = await tx
          .select()
          .from(fixedTransactionOverrides)
          .orderBy(asc(fixedTransactionOverrides.id));
        const transactionRows = await tx.select().from(transactions).orderBy(asc(transactions.id));
        const marketReceiptRows = await tx.select().from(marketReceipts).orderBy(asc(marketReceipts.id));
        const marketItemRows = await tx.select().from(marketItems).orderBy(asc(marketItems.id));
        const marketReceiptTxRows = await tx
          .select()
          .from(marketReceiptTransactions)
          .orderBy(asc(marketReceiptTransactions.receiptId), asc(marketReceiptTransactions.transactionId));
        const budgetRows = await tx.select().from(budgets).orderBy(asc(budgets.id));
        const budgetConfigRows = await tx.select().from(budgetMonthConfigs).orderBy(asc(budgetMonthConfigs.id));
        const batchLogRows = await tx.select().from(batchLogs).orderBy(asc(batchLogs.id));
        const importLogRows = await tx.select().from(importLogs).orderBy(asc(importLogs.id));

        const dataSnapshot: DatabaseBackupSnapshot = {
          users: userRows,
          settings: settingRows,
          accounts: accountRows,
          categories: categoryRows,
          subcategories: subcategoryRows,
          credit_cards: creditCardRows,
          loans: loanRows,
          allocation_rules: allocationRuleRows,
          fixed_transactions: fixedTransactionRows,
          fixed_transaction_overrides: fixedOverrideRows,
          transactions: transactionRows,
          market_receipts: marketReceiptRows,
          market_items: marketItemRows,
          market_receipt_transactions: marketReceiptTxRows,
          budgets: budgetRows,
          budget_month_configs: budgetConfigRows,
          batch_logs: batchLogRows,
          import_logs: importLogRows,
        };

        return {
          snapshot: dataSnapshot,
          postgresVersion: extractPostgresShortVersion(versionRows[0]?.version ?? "PostgreSQL"),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );

    const built = buildSqlBackup(snapshot, {
      generatedAt: new Date(),
      postgresVersion,
      appVersion: packageJson.version,
    });

    return {
      success: true,
      filename: built.filename,
      sqlContent: built.sqlContent,
      sizeBytes: built.sizeBytes,
      totalRows: built.totalRows,
      tableCount: built.tableCount,
      generatedAt: built.generatedAt,
    };
  } catch (error) {
    console.error("Error generating SQL backup:", error);
    return {
      success: false,
      error: "Não foi possível gerar o backup SQL. Tente novamente.",
    };
  }
}
