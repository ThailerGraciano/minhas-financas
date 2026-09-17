import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "budgets" (
        "id" serial PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "category_id" integer NOT NULL REFERENCES "categories"("id"),
        "subcategory_id" integer REFERENCES "subcategories"("id"),
        "amount" numeric(12, 2) NOT NULL,
        "pillar" varchar(50) NOT NULL,
        "month" varchar(7) NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_budgets_user_month" ON "budgets"("user_id", "month");
    `);
    console.log("Table budgets created or already exists.");
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error creating budgets table:", e.message);
    }
  }

  console.log("Migration completed");
  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
