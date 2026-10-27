import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`
      ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "income_source_id" varchar(100);
    `);
    console.log("Column income_source_id added or already exists on budgets table.");

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "budget_month_configs" (
        "id" serial PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "month" varchar(7) NOT NULL,
        "selected_income_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_budget_month_configs_user_month" ON "budget_month_configs"("user_id", "month");
    `);
    console.log("Table budget_month_configs created or already exists.");
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error migrating budget planner schema:", e.message);
    }
  }

  console.log("Migration completed");
  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});

