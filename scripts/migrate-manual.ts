import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "import_hash" varchar(255);`);
    await sql.unsafe(
      `ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_hash_unique" UNIQUE("import_hash");`,
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log("Transaction import_hash might already exist or constraint exists. Error:", e.message);
    await sql.unsafe(`ALTER TABLE "import_logs" ADD COLUMN IF NOT EXISTS "skipped_rows" integer DEFAULT 0 NOT NULL;`);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log("import_logs skipped_rows might already exist. Error:", e.message);
    }
  }

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
