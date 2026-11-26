import type {
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

export type BackupTableName =
  | "users"
  | "settings"
  | "accounts"
  | "categories"
  | "subcategories"
  | "credit_cards"
  | "loans"
  | "allocation_rules"
  | "fixed_transactions"
  | "fixed_transaction_overrides"
  | "transactions"
  | "market_receipts"
  | "market_items"
  | "market_receipt_transactions"
  | "budgets"
  | "budget_month_configs"
  | "batch_logs"
  | "import_logs";

export interface BackupTableCatalogItem {
  tableName: BackupTableName;
  label: string;
  hasSerialId: boolean;
}

export const BACKUP_TABLE_CATALOG: readonly BackupTableCatalogItem[] = [
  { tableName: "users", label: "Usuários", hasSerialId: false },
  { tableName: "settings", label: "Configurações", hasSerialId: true },
  { tableName: "accounts", label: "Contas Bancárias", hasSerialId: true },
  { tableName: "categories", label: "Categorias", hasSerialId: true },
  { tableName: "subcategories", label: "Subcategorias", hasSerialId: true },
  { tableName: "credit_cards", label: "Cartões de Crédito", hasSerialId: true },
  { tableName: "loans", label: "Empréstimos", hasSerialId: false },
  { tableName: "allocation_rules", label: "Regras de Alocação", hasSerialId: false },
  { tableName: "fixed_transactions", label: "Transações Fixas", hasSerialId: false },
  { tableName: "fixed_transaction_overrides", label: "Exceções de Fixas", hasSerialId: false },
  { tableName: "transactions", label: "Transações", hasSerialId: true },
  { tableName: "market_receipts", label: "Cupons de Mercado", hasSerialId: false },
  { tableName: "market_items", label: "Itens de Mercado", hasSerialId: false },
  { tableName: "market_receipt_transactions", label: "Vínculos Cupom/Transação", hasSerialId: false },
  { tableName: "budgets", label: "Orçamentos", hasSerialId: true },
  { tableName: "budget_month_configs", label: "Configuração de Orçamento", hasSerialId: true },
  { tableName: "batch_logs", label: "Logs em Lote", hasSerialId: false },
  { tableName: "import_logs", label: "Logs de Importação", hasSerialId: false },
] as const;

export interface DatabaseBackupSnapshot {
  users: (typeof users.$inferSelect)[];
  settings: (typeof settings.$inferSelect)[];
  accounts: (typeof accounts.$inferSelect)[];
  categories: (typeof categories.$inferSelect)[];
  subcategories: (typeof subcategories.$inferSelect)[];
  credit_cards: (typeof creditCards.$inferSelect)[];
  loans: (typeof loans.$inferSelect)[];
  allocation_rules: (typeof allocationRules.$inferSelect)[];
  fixed_transactions: (typeof fixedTransactions.$inferSelect)[];
  fixed_transaction_overrides: (typeof fixedTransactionOverrides.$inferSelect)[];
  transactions: (typeof transactions.$inferSelect)[];
  market_receipts: (typeof marketReceipts.$inferSelect)[];
  market_items: (typeof marketItems.$inferSelect)[];
  market_receipt_transactions: (typeof marketReceiptTransactions.$inferSelect)[];
  budgets: (typeof budgets.$inferSelect)[];
  budget_month_configs: (typeof budgetMonthConfigs.$inferSelect)[];
  batch_logs: (typeof batchLogs.$inferSelect)[];
  import_logs: (typeof importLogs.$inferSelect)[];
}

export interface SqlBackupMetadata {
  generatedAt: Date;
  postgresVersion: string;
  appVersion: string;
}

export interface BuiltSqlBackup {
  sqlContent: string;
  filename: string;
  sizeBytes: number;
  totalRows: number;
  tableCount: number;
  generatedAt: string;
}

type SqlValueKind = "standard" | "jsonb";

interface ColumnSpec<TRow> {
  key: keyof TRow;
  column: string;
  kind?: SqlValueKind;
}

const INSERT_CHUNK_SIZE = 100;

export function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function escapeSqlString(value: string): string {
  const sanitized = value.replace(/\0/g, "");
  if (sanitized.includes("\n") || sanitized.includes("\r")) {
    const escaped = sanitized
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
    return `E'${escaped}'`;
  }
  return `'${sanitized.replace(/'/g, "''")}'`;
}

export function serializeSqlValue(value: unknown, kind: SqlValueKind = "standard"): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (kind === "jsonb") {
    return `${escapeSqlString(JSON.stringify(value))}::jsonb`;
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (value instanceof Date) {
    return escapeSqlString(value.toISOString());
  }

  if (typeof value === "string") {
    return escapeSqlString(value);
  }

  return `${escapeSqlString(JSON.stringify(value))}::jsonb`;
}

export function formatBackupFilename(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `minhas-financas-backup-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.sql`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${units[unitIndex]}`;
}

function buildInsertStatements<TRow>(
  tableName: BackupTableName,
  rows: readonly TRow[],
  columns: readonly ColumnSpec<TRow>[],
  transformRow?: (row: TRow) => TRow,
): string[] {
  const lines: string[] = [`-- Tabela: ${tableName} (${rows.length} registros)`];
  if (rows.length === 0) {
    return lines;
  }

  const columnList = columns.map((c) => quoteSqlIdentifier(c.column)).join(", ");
  const tableRef = `${quoteSqlIdentifier("public")}.${quoteSqlIdentifier(tableName)}`;

  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
    const tuples = chunk.map((rawRow) => {
      const row = transformRow ? transformRow(rawRow) : rawRow;
      const values = columns.map((col) => serializeSqlValue(row[col.key], col.kind ?? "standard")).join(", ");
      return `  (${values})`;
    });
    lines.push(`INSERT INTO ${tableRef} (${columnList}) VALUES\n${tuples.join(",\n")};`);
  }

  return lines;
}

const USERS_COLUMNS: readonly ColumnSpec<typeof users.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "name", column: "name" },
  { key: "email", column: "email" },
  { key: "passwordHash", column: "password_hash" },
  { key: "createdAt", column: "created_at" },
];

const SETTINGS_COLUMNS: readonly ColumnSpec<typeof settings.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "closingDay", column: "closing_day" },
  { key: "baseKeepAmount", column: "base_keep_amount" },
];

const ACCOUNTS_COLUMNS: readonly ColumnSpec<typeof accounts.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "name", column: "name" },
  { key: "type", column: "type" },
  { key: "currentBalance", column: "current_balance" },
  { key: "targetAmount", column: "target_amount" },
];

const CATEGORIES_COLUMNS: readonly ColumnSpec<typeof categories.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "name", column: "name" },
  { key: "type", column: "type" },
  { key: "icon", column: "icon" },
  { key: "isPredictable", column: "is_predictable" },
];

const SUBCATEGORIES_COLUMNS: readonly ColumnSpec<typeof subcategories.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "categoryId", column: "category_id" },
  { key: "name", column: "name" },
  { key: "isPredictable", column: "is_predictable" },
];

const CREDIT_CARDS_COLUMNS: readonly ColumnSpec<typeof creditCards.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "name", column: "name" },
  { key: "creditLimit", column: "credit_limit" },
  { key: "closingDay", column: "closing_day" },
  { key: "dueDay", column: "due_day" },
];

const LOANS_COLUMNS: readonly ColumnSpec<typeof loans.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "name", column: "name" },
  { key: "type", column: "type" },
  { key: "totalAmount", column: "total_amount" },
  { key: "interestRate", column: "interest_rate" },
  { key: "installments", column: "installments" },
  { key: "createdAt", column: "created_at" },
];

const ALLOCATION_RULES_COLUMNS: readonly ColumnSpec<typeof allocationRules.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "name", column: "name" },
  { key: "percentage", column: "percentage" },
  { key: "createdAt", column: "created_at" },
];

const FIXED_TRANSACTIONS_COLUMNS: readonly ColumnSpec<typeof fixedTransactions.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "type", column: "type" },
  { key: "accountId", column: "account_id" },
  { key: "creditCardId", column: "credit_card_id" },
  { key: "categoryId", column: "category_id" },
  { key: "subcategoryId", column: "subcategory_id" },
  { key: "amount", column: "amount" },
  { key: "description", column: "description" },
  { key: "startDate", column: "start_date" },
  { key: "endMonth", column: "end_month" },
  { key: "active", column: "active" },
  { key: "destinationAccountId", column: "destination_account_id" },
];

const FIXED_TRANSACTION_OVERRIDES_COLUMNS: readonly ColumnSpec<typeof fixedTransactionOverrides.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "fixedTransactionId", column: "fixed_transaction_id" },
  { key: "competencyMonth", column: "competency_month" },
  { key: "amount", column: "amount" },
  { key: "description", column: "description" },
  { key: "dueDate", column: "due_date" },
  { key: "launchDate", column: "launch_date" },
  { key: "categoryId", column: "category_id" },
  { key: "subcategoryId", column: "subcategory_id" },
  { key: "accountId", column: "account_id" },
  { key: "creditCardId", column: "credit_card_id" },
  { key: "destinationAccountId", column: "destination_account_id" },
  { key: "isIgnored", column: "is_ignored" },
  { key: "createdAt", column: "created_at" },
  { key: "updatedAt", column: "updated_at" },
];

const TRANSACTIONS_COLUMNS: readonly ColumnSpec<typeof transactions.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "type", column: "type" },
  { key: "accountId", column: "account_id" },
  { key: "creditCardId", column: "credit_card_id" },
  { key: "categoryId", column: "category_id" },
  { key: "subcategoryId", column: "subcategory_id" },
  { key: "amount", column: "amount" },
  { key: "description", column: "description" },
  { key: "dueDate", column: "due_date" },
  { key: "launchDate", column: "launch_date" },
  { key: "competencyMonth", column: "competency_month" },
  { key: "status", column: "status" },
  { key: "isFixed", column: "is_fixed" },
  { key: "fixedTransactionId", column: "fixed_transaction_id" },
  { key: "installmentCurrent", column: "installment_current" },
  { key: "installmentTotal", column: "installment_total" },
  { key: "parentTransactionId", column: "parent_transaction_id" },
  { key: "installmentParentId", column: "installment_parent_id" },
  { key: "observations", column: "observations" },
  { key: "paidAt", column: "paid_at" },
  { key: "importHash", column: "import_hash" },
  { key: "invoiceMonth", column: "invoice_month" },
  { key: "loanId", column: "loan_id" },
];

const MARKET_RECEIPTS_COLUMNS: readonly ColumnSpec<typeof marketReceipts.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "storeName", column: "store_name" },
  { key: "date", column: "date" },
  { key: "totalAmount", column: "total_amount" },
];

const MARKET_ITEMS_COLUMNS: readonly ColumnSpec<typeof marketItems.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "receiptId", column: "receipt_id" },
  { key: "description", column: "description" },
  { key: "quantity", column: "quantity" },
  { key: "unitMeasure", column: "unit_measure" },
  { key: "category", column: "category" },
  { key: "unitPrice", column: "unit_price" },
  { key: "originalPrice", column: "original_price" },
  { key: "discountAmount", column: "discount_amount" },
  { key: "netPrice", column: "net_price" },
];

const MARKET_RECEIPT_TRANSACTIONS_COLUMNS: readonly ColumnSpec<typeof marketReceiptTransactions.$inferSelect>[] = [
  { key: "receiptId", column: "receipt_id" },
  { key: "transactionId", column: "transaction_id" },
];

const BUDGETS_COLUMNS: readonly ColumnSpec<typeof budgets.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "categoryId", column: "category_id" },
  { key: "subcategoryId", column: "subcategory_id" },
  { key: "amount", column: "amount" },
  { key: "pillar", column: "pillar" },
  { key: "incomeSourceId", column: "income_source_id" },
  { key: "createdAt", column: "created_at" },
  { key: "updatedAt", column: "updated_at" },
];

const BUDGET_MONTH_CONFIGS_COLUMNS: readonly ColumnSpec<typeof budgetMonthConfigs.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "selectedIncomeIds", column: "selected_income_ids", kind: "jsonb" },
  { key: "updatedAt", column: "updated_at" },
];

const BATCH_LOGS_COLUMNS: readonly ColumnSpec<typeof batchLogs.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "userId", column: "user_id" },
  { key: "batchId", column: "batch_id" },
  { key: "transactionId", column: "transaction_id" },
  { key: "actionType", column: "action_type" },
  { key: "beforeData", column: "before_data", kind: "jsonb" },
  { key: "afterData", column: "after_data", kind: "jsonb" },
  { key: "createdAt", column: "created_at" },
];

const IMPORT_LOGS_COLUMNS: readonly ColumnSpec<typeof importLogs.$inferSelect>[] = [
  { key: "id", column: "id" },
  { key: "filename", column: "filename" },
  { key: "totalRows", column: "total_rows" },
  { key: "successRows", column: "success_rows" },
  { key: "errorRows", column: "error_rows" },
  { key: "errorsDetail", column: "errors_detail", kind: "jsonb" },
  { key: "skippedRows", column: "skipped_rows" },
  { key: "createdAt", column: "created_at" },
];

export function buildSqlBackup(snapshot: DatabaseBackupSnapshot, metadata: SqlBackupMetadata): BuiltSqlBackup {
  const generatedIso = metadata.generatedAt.toISOString();
  const filename = formatBackupFilename(metadata.generatedAt);

  const totalRows =
    snapshot.users.length +
    snapshot.settings.length +
    snapshot.accounts.length +
    snapshot.categories.length +
    snapshot.subcategories.length +
    snapshot.credit_cards.length +
    snapshot.loans.length +
    snapshot.allocation_rules.length +
    snapshot.fixed_transactions.length +
    snapshot.fixed_transaction_overrides.length +
    snapshot.transactions.length +
    snapshot.market_receipts.length +
    snapshot.market_items.length +
    snapshot.market_receipt_transactions.length +
    snapshot.budgets.length +
    snapshot.budget_month_configs.length +
    snapshot.batch_logs.length +
    snapshot.import_logs.length;

  const truncateTargets = [...BACKUP_TABLE_CATALOG]
    .reverse()
    .map((item) => `${quoteSqlIdentifier("public")}.${quoteSqlIdentifier(item.tableName)}`)
    .join(",\n  ");

  const sections: string[] = [
    [
      "-- =============================================================================",
      "-- Minhas Finanças AI - Backup Completo do Banco de Dados (SQL)",
      `-- Gerado em: ${generatedIso}`,
      `-- App Version: ${metadata.appVersion}`,
      `-- PostgreSQL: ${metadata.postgresVersion}`,
      `-- Tabelas: ${BACKUP_TABLE_CATALOG.length} | Registros totais: ${totalRows}`,
      "--",
      "-- Como restaurar:",
      "--   1. Em um banco vazio, aplique o schema antes (ex: npx drizzle-kit push).",
      "--   2. Execute este arquivo no Supabase SQL Editor ou via psql:",
      `--      psql "$DATABASE_URL" -f ${filename}`,
      "-- =============================================================================",
    ].join("\n"),
    [
      "SET client_encoding = 'UTF8';",
      "SET standard_conforming_strings = on;",
      "SET check_function_bodies = false;",
    ].join("\n"),
    "BEGIN;",
    `TRUNCATE TABLE\n  ${truncateTargets}\nRESTART IDENTITY CASCADE;`,
  ];

  sections.push(...buildInsertStatements("users", snapshot.users, USERS_COLUMNS));
  sections.push(...buildInsertStatements("settings", snapshot.settings, SETTINGS_COLUMNS));
  sections.push(...buildInsertStatements("accounts", snapshot.accounts, ACCOUNTS_COLUMNS));
  sections.push(...buildInsertStatements("categories", snapshot.categories, CATEGORIES_COLUMNS));
  sections.push(...buildInsertStatements("subcategories", snapshot.subcategories, SUBCATEGORIES_COLUMNS));
  sections.push(...buildInsertStatements("credit_cards", snapshot.credit_cards, CREDIT_CARDS_COLUMNS));
  sections.push(...buildInsertStatements("loans", snapshot.loans, LOANS_COLUMNS));
  sections.push(...buildInsertStatements("allocation_rules", snapshot.allocation_rules, ALLOCATION_RULES_COLUMNS));
  sections.push(...buildInsertStatements("fixed_transactions", snapshot.fixed_transactions, FIXED_TRANSACTIONS_COLUMNS));
  sections.push(
    ...buildInsertStatements(
      "fixed_transaction_overrides",
      snapshot.fixed_transaction_overrides,
      FIXED_TRANSACTION_OVERRIDES_COLUMNS,
    ),
  );

  // Insere transações sem autorreferências primeiro para evitar violação de FK independente da ordem dos IDs
  sections.push(
    ...buildInsertStatements("transactions", snapshot.transactions, TRANSACTIONS_COLUMNS, (row) => ({
      ...row,
      parentTransactionId: null,
      installmentParentId: null,
    })),
  );

  const transactionParentUpdates = snapshot.transactions
    .filter((row) => row.parentTransactionId !== null || row.installmentParentId !== null)
    .map(
      (row) =>
        `UPDATE "public"."transactions" SET "parent_transaction_id" = ${serializeSqlValue(row.parentTransactionId)}, "installment_parent_id" = ${serializeSqlValue(row.installmentParentId)} WHERE "id" = ${serializeSqlValue(row.id)};`,
    );

  if (transactionParentUpdates.length > 0) {
    sections.push("-- Autorreferências da tabela transactions", ...transactionParentUpdates);
  }

  sections.push(...buildInsertStatements("market_receipts", snapshot.market_receipts, MARKET_RECEIPTS_COLUMNS));
  sections.push(...buildInsertStatements("market_items", snapshot.market_items, MARKET_ITEMS_COLUMNS));
  sections.push(
    ...buildInsertStatements(
      "market_receipt_transactions",
      snapshot.market_receipt_transactions,
      MARKET_RECEIPT_TRANSACTIONS_COLUMNS,
    ),
  );
  sections.push(...buildInsertStatements("budgets", snapshot.budgets, BUDGETS_COLUMNS));
  sections.push(
    ...buildInsertStatements("budget_month_configs", snapshot.budget_month_configs, BUDGET_MONTH_CONFIGS_COLUMNS),
  );
  sections.push(...buildInsertStatements("batch_logs", snapshot.batch_logs, BATCH_LOGS_COLUMNS));
  sections.push(...buildInsertStatements("import_logs", snapshot.import_logs, IMPORT_LOGS_COLUMNS));

  const sequenceStatements = BACKUP_TABLE_CATALOG.filter((item) => item.hasSerialId).map(
    (item) =>
      `SELECT setval(pg_get_serial_sequence('public.${item.tableName}', 'id'), COALESCE((SELECT MAX("id") FROM "public"."${item.tableName}"), 1), (SELECT COUNT(*) > 0 FROM "public"."${item.tableName}"));`,
  );

  sections.push("-- Sincronização das sequences (serial)", ...sequenceStatements);
  sections.push("COMMIT;");

  const sqlContent = `${sections.join("\n\n")}\n`;
  const sizeBytes = new TextEncoder().encode(sqlContent).byteLength;

  return {
    sqlContent,
    filename,
    sizeBytes,
    totalRows,
    tableCount: BACKUP_TABLE_CATALOG.length,
    generatedAt: generatedIso,
  };
}
