import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    await sql.unsafe(`ALTER TABLE "market_items" ADD COLUMN "unit_price" numeric(12, 2) DEFAULT '0' NOT NULL;`);
    console.log('Added unit_price column');
  } catch(e: any) {
    console.log("unit_price error:", e.message);
  }

  console.log('Migration completed');
  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
