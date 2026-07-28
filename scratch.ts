import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const sqlString = fs.readFileSync(path.join(process.cwd(), 'drizzle/0005_flowery_tana_nile.sql'), 'utf-8');
  
  const statements = sqlString.split('--> statement-breakpoint');
  
  for (const stmt of statements) {
    if (stmt.trim()) {
      console.log('Executing:', stmt.trim());
      await sql.unsafe(stmt.trim());
    }
  }
  
  console.log('Migration applied successfully.');
  process.exit(0);
}

main().catch(console.error);
