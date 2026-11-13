import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function runMigration() {
  const migrationPath = path.join(process.cwd(), "drizzle", "0011_global_budgets.sql");
  const rawSql = fs.readFileSync(migrationPath, "utf8");

  await sql.begin(async (tx) => {
    await tx.unsafe(rawSql);
  });

  console.log("Global budgets migration applied successfully.");
  await sql.end();
}

runMigration().catch((err: unknown) => {
  console.error("Failed to run global budgets migration:", err);
  process.exit(1);
});
