import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("Checking transactions columns...");
  const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'transactions';
  `;
  const columnNames = columns.map((c) => c.column_name);
  console.log("Current transaction columns:", columnNames);

  if (columnNames.includes("date") && !columnNames.includes("due_date")) {
    console.log("Renaming 'date' to 'due_date'...");
    await sql.unsafe(`ALTER TABLE "transactions" RENAME COLUMN "date" TO "due_date";`);
  } else {
    console.log("'due_date' column already exists or 'date' not found.");
  }

  if (!columnNames.includes("launch_date")) {
    console.log("Adding 'launch_date' column...");
    await sql.unsafe(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "launch_date" date;`);
  }

  console.log("Backfilling 'launch_date'...");
  const updated = await sql.unsafe(`
    UPDATE "transactions"
    SET "launch_date" = CASE
      WHEN "paid_at" IS NOT NULL AND DATE("paid_at") < "due_date" THEN DATE("paid_at")
      ELSE "due_date"
    END
    WHERE "launch_date" IS NULL;
  `);
  console.log("Backfilled rows:", updated.count);

  console.log("Setting 'launch_date' to NOT NULL...");
  await sql.unsafe(`ALTER TABLE "transactions" ALTER COLUMN "launch_date" SET NOT NULL;`);

  console.log("Migration finished successfully!");
  process.exit(0);
}

runMigration().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
