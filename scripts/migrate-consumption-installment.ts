import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function runMigration() {
  const migrationPath = path.join(process.cwd(), "drizzle", "0013_consumption_installment_nature.sql");
  const rawSql = fs.readFileSync(migrationPath, "utf8");

  await sql.begin(async (tx) => {
    await tx.unsafe(rawSql);
  });

  const constraints = await sql<{ conname: string; def: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conname = 'transactions_consumption_nature_check';
  `;

  console.log("Migration 0013_consumption_installment_nature applied successfully.");
  console.log("Verified constraint:", constraints.map((c) => `${c.conname}: ${c.def}`).join(", "));

  await sql.end();
}

runMigration().catch((err: unknown) => {
  console.error("Failed to run installment nature migration:", err);
  process.exit(1);
});
