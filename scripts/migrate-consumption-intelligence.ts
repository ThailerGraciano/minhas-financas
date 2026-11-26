import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function runMigration() {
  const migrationPath = path.join(process.cwd(), "drizzle", "0012_consumption_intelligence.sql");
  const rawSql = fs.readFileSync(migrationPath, "utf8");

  await sql.begin(async (tx) => {
    await tx.unsafe(rawSql);
  });

  const columns = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'transactions' AND column_name IN ('consumption_nature', 'consumption_nature_source', 'consumption_classified_at'))
        OR (table_name = 'categories' AND column_name = 'default_consumption_nature')
        OR (table_name = 'subcategories' AND column_name = 'default_consumption_nature')
      )
    ORDER BY table_name, column_name;
  `;

  const indexes = await sql<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND indexname IN (
        'idx_transactions_user_launch_type',
        'idx_transactions_user_installment_parent',
        'idx_transactions_user_manual_nature'
      )
    ORDER BY indexname;
  `;

  const constraints = await sql<{ conname: string }[]>`
    SELECT conname
    FROM pg_constraint
    WHERE conname IN (
      'transactions_consumption_nature_check',
      'transactions_consumption_nature_source_check',
      'categories_default_consumption_nature_check',
      'subcategories_default_consumption_nature_check'
    )
    ORDER BY conname;
  `;

  console.log("Migration 0012_consumption_intelligence applied successfully.");
  console.log("Verified columns:", columns.map((c) => `${c.table_name}.${c.column_name}`).join(", "));
  console.log("Verified constraints:", constraints.map((c) => c.conname).join(", "));
  console.log("Verified indexes:", indexes.map((i) => i.indexname).join(", "));

  await sql.end();
}

runMigration().catch((err: unknown) => {
  console.error("Failed to run consumption intelligence migration:", err);
  process.exit(1);
});
