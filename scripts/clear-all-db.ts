import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Iniciando limpeza total do banco de dados...");
  try {
    // Apagar todas as tabelas usando CASCADE
    await db.execute(sql`TRUNCATE TABLE transactions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE fixed_transactions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE import_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE subcategories CASCADE`);
    await db.execute(sql`TRUNCATE TABLE categories CASCADE`);
    await db.execute(sql`TRUNCATE TABLE accounts CASCADE`);
    await db.execute(sql`TRUNCATE TABLE credit_cards CASCADE`);
    await db.execute(sql`TRUNCATE TABLE market_receipt_transactions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE market_items CASCADE`);
    await db.execute(sql`TRUNCATE TABLE market_receipts CASCADE`);
    await db.execute(sql`TRUNCATE TABLE settings CASCADE`);

    console.log("✅ Limpeza TOTAL concluída com sucesso! Todas as tabelas foram limpas.");
  } catch (error) {
    console.error("❌ Erro ao limpar banco de dados:", error);
  } finally {
    process.exit(0);
  }
}

main();
