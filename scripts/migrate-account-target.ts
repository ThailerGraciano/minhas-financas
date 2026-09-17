import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "target_amount" numeric(12, 2);`);
    console.log("Column target_amount added or already exists on accounts table.");
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log("Error migrating target_amount on accounts:", e.message);
    }
  }

  console.log("Migration completed");
  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
