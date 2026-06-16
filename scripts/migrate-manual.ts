import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "import_hash" varchar(255);`);
    await sql.unsafe(`ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_hash_unique" UNIQUE("import_hash");`);
  } catch(e: any) {
    console.log("Transaction import_hash might already exist or constraint exists. Error:", e.message);
  }

  try {
    await sql.unsafe(`ALTER TABLE "import_logs" ADD COLUMN IF NOT EXISTS "skipped_rows" integer DEFAULT 0 NOT NULL;`);
  } catch(e: any) {
    console.log("import_logs skipped_rows might already exist. Error:", e.message);
  }

  console.log('Migration completed');
  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
