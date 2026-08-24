import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

import * as fs from "fs";

async function runMigration() {
  try {
    const fileContent = fs.readFileSync("drizzle/0003_ordinary_ben_grimm.sql", "utf8");
    const statements = fileContent.split("--> statement-breakpoint");

    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement);
      }
    }

    console.log("Migration 0003 applied successfully.");
  } catch (e: unknown) {
    console.error("Migration error:", e);
  }

  process.exit(0);
}

runMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
