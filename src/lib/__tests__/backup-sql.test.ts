import { describe, expect, it } from "vitest";
import {
  BACKUP_TABLE_CATALOG,
  buildSqlBackup,
  type DatabaseBackupSnapshot,
  escapeSqlString,
  formatBackupFilename,
  formatBytes,
  quoteSqlIdentifier,
  serializeSqlValue,
} from "../backup-sql";

function createEmptySnapshot(): DatabaseBackupSnapshot {
  return {
    users: [],
    settings: [],
    accounts: [],
    categories: [],
    subcategories: [],
    credit_cards: [],
    loans: [],
    allocation_rules: [],
    fixed_transactions: [],
    fixed_transaction_overrides: [],
    transactions: [],
    market_receipts: [],
    market_items: [],
    market_receipt_transactions: [],
    budgets: [],
    budget_month_configs: [],
    batch_logs: [],
    import_logs: [],
  };
}

describe("backup-sql utilities", () => {
  it("quotes SQL identifiers safely", () => {
    expect(quoteSqlIdentifier("transactions")).toBe('"transactions"');
    expect(quoteSqlIdentifier('weird"name')).toBe('"weird""name"');
  });

  it("escapes strings including quotes, backslashes, newlines, and NUL bytes", () => {
    expect(escapeSqlString("Conta do João")).toBe("'Conta do João'");
    expect(escapeSqlString("D'água")).toBe("'D''água'");
    expect(escapeSqlString("Linha 1\nLinha 2\r\nC:\\temp\\a'b\0")).toBe(
      "E'Linha 1\\nLinha 2\\r\\nC:\\\\temp\\\\a''b'",
    );
  });

  it("serializes primitive, null, Date, and jsonb values correctly", () => {
    expect(serializeSqlValue(null)).toBe("NULL");
    expect(serializeSqlValue(undefined)).toBe("NULL");
    expect(serializeSqlValue(null, "jsonb")).toBe("NULL");
    expect(serializeSqlValue(true)).toBe("TRUE");
    expect(serializeSqlValue(false)).toBe("FALSE");
    expect(serializeSqlValue(42.5)).toBe("42.5");
    expect(serializeSqlValue(Number.NaN)).toBe("NULL");
    expect(serializeSqlValue(Number.POSITIVE_INFINITY)).toBe("NULL");
    expect(serializeSqlValue(new Date("2026-11-24T13:00:00.000Z"))).toBe("'2026-11-24T13:00:00.000Z'");
    expect(serializeSqlValue(["inc-1", "inc'2"], "jsonb")).toBe("'[\"inc-1\",\"inc''2\"]'::jsonb");
    expect(serializeSqlValue({ reason: "Linha 1\nLinha 2" }, "jsonb")).toBe(
      "'{\"reason\":\"Linha 1\\nLinha 2\"}'::jsonb",
    );
  });

  it("formats backup filename and byte sizes consistently", () => {
    const localDate = new Date(2026, 10, 24, 9, 5, 7);
    expect(formatBackupFilename(localDate)).toBe("minhas-financas-backup-2026-11-24_09-05-07.sql");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toMatch(/1,00 KB/);
    expect(formatBytes(500 * 1024 * 1024)).toMatch(/500,00 MB/);
  });
});

describe("buildSqlBackup", () => {
  const fixedDate = new Date("2026-11-24T13:10:00.000Z");

  it("generates transactional SQL with TRUNCATE, ordered inserts, self-referential updates, and sequence sync", () => {
    const snapshot = createEmptySnapshot();

    snapshot.users.push({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Thailer",
      email: "thailer@example.com",
      passwordHash: "$2b$10$hash",
      createdAt: fixedDate,
    });
    snapshot.accounts.push({
      id: 10,
      userId: "11111111-1111-1111-1111-111111111111",
      name: "Nubank",
      type: "checking",
      currentBalance: "1500.00",
      targetAmount: null,
    });
    snapshot.categories.push({
      id: 5,
      userId: "11111111-1111-1111-1111-111111111111",
      name: "Mercado",
      type: "expense",
      icon: "ShoppingCart",
      isPredictable: true,
    });

    // Parcela filha (id=1) aponta para parcela pai (id=20) com id maior
    snapshot.transactions.push(
      {
        id: 1,
        userId: "11111111-1111-1111-1111-111111111111",
        type: "expense",
        accountId: 10,
        creditCardId: null,
        categoryId: 5,
        subcategoryId: null,
        amount: "100.00",
        description: "Compra D'água\nParcela 2",
        dueDate: "2026-12-10",
        launchDate: "2026-11-10",
        competencyMonth: "2026-12",
        status: "pending",
        isFixed: false,
        fixedTransactionId: null,
        installmentCurrent: 2,
        installmentTotal: 2,
        parentTransactionId: 20,
        installmentParentId: 20,
        observations: null,
        paidAt: null,
        importHash: null,
        invoiceMonth: null,
        loanId: null,
      },
      {
        id: 20,
        userId: "11111111-1111-1111-1111-111111111111",
        type: "expense",
        accountId: 10,
        creditCardId: null,
        categoryId: 5,
        subcategoryId: null,
        amount: "100.00",
        description: "Compra D'água Parcela 1",
        dueDate: "2026-11-10",
        launchDate: "2026-11-10",
        competencyMonth: "2026-11",
        status: "paid",
        isFixed: false,
        fixedTransactionId: null,
        installmentCurrent: 1,
        installmentTotal: 2,
        parentTransactionId: null,
        installmentParentId: null,
        observations: null,
        paidAt: fixedDate,
        importHash: "hash-1",
        invoiceMonth: null,
        loanId: null,
      },
    );

    snapshot.market_receipts.push({
      id: "22222222-2222-2222-2222-222222222222",
      userId: "11111111-1111-1111-1111-111111111111",
      storeName: "Supermercado Central",
      date: fixedDate,
      totalAmount: "200.00",
    });

    snapshot.market_receipt_transactions.push({
      receiptId: "22222222-2222-2222-2222-222222222222",
      transactionId: 20,
    });

    snapshot.budget_month_configs.push({
      id: 1,
      userId: "11111111-1111-1111-1111-111111111111",
      selectedIncomeIds: ["fixed:abc", "tx:20"],
      updatedAt: fixedDate,
    });

    const result = buildSqlBackup(snapshot, {
      generatedAt: fixedDate,
      postgresVersion: "PostgreSQL 17.6",
      appVersion: "0.1.0",
    });

    expect(result.tableCount).toBe(18);
    expect(result.totalRows).toBe(8);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const sql = result.sqlContent;
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("TRUNCATE TABLE");
    expect(sql).toContain("RESTART IDENTITY CASCADE;");
    expect(sql).toContain("COMMIT;");

    // Ordem topológica das tabelas
    const usersIdx = sql.indexOf('INSERT INTO "public"."users"');
    const accountsIdx = sql.indexOf('INSERT INTO "public"."accounts"');
    const txIdx = sql.indexOf('INSERT INTO "public"."transactions"');
    const receiptsIdx = sql.indexOf('INSERT INTO "public"."market_receipts"');
    const receiptTxIdx = sql.indexOf('INSERT INTO "public"."market_receipt_transactions"');
    expect(usersIdx).toBeGreaterThan(-1);
    expect(accountsIdx).toBeGreaterThan(usersIdx);
    expect(txIdx).toBeGreaterThan(accountsIdx);
    expect(receiptsIdx).toBeGreaterThan(txIdx);
    expect(receiptTxIdx).toBeGreaterThan(receiptsIdx);

    // Self-reference em transactions é inserida como NULL e atualizada depois
    expect(sql).toContain(
      'UPDATE "public"."transactions" SET "parent_transaction_id" = 20, "installment_parent_id" = 20 WHERE "id" = 1;',
    );
    expect(sql).toContain('["fixed:abc","tx:20"]\'::jsonb');
    expect(sql).toContain("E'Compra D''água\\nParcela 2'");

    // Todas as 8 tabelas serial têm setval
    for (const table of BACKUP_TABLE_CATALOG.filter((t) => t.hasSerialId)) {
      expect(sql).toContain(`pg_get_serial_sequence('public.${table.tableName}', 'id')`);
    }
  });

  it("handles completely empty snapshot without generating INSERT statements", () => {
    const result = buildSqlBackup(createEmptySnapshot(), {
      generatedAt: fixedDate,
      postgresVersion: "PostgreSQL 17.6",
      appVersion: "0.1.0",
    });

    expect(result.totalRows).toBe(0);
    expect(result.sqlContent).not.toContain("INSERT INTO");
    expect(result.sqlContent).toContain("-- Tabela: transactions (0 registros)");
    expect(result.sqlContent).toContain("COMMIT;");
  });

  it("chunks INSERT statements into batches of 100 rows", () => {
    const snapshot = createEmptySnapshot();
    for (let i = 1; i <= 105; i += 1) {
      snapshot.import_logs.push({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
        filename: `import-${i}.csv`,
        totalRows: 10,
        successRows: 10,
        errorRows: 0,
        errorsDetail: null,
        skippedRows: 0,
        createdAt: fixedDate,
      });
    }

    const result = buildSqlBackup(snapshot, {
      generatedAt: fixedDate,
      postgresVersion: "PostgreSQL 17.6",
      appVersion: "0.1.0",
    });

    const insertMatches = result.sqlContent.match(/INSERT INTO "public"\."import_logs"/g);
    expect(insertMatches).toHaveLength(2);
    expect(result.totalRows).toBe(105);
  });
});
