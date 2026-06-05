import { db } from '../src/db';
import { transactions, importLogs, accounts } from '../src/db/schema';

async function main() {
  console.log("Iniciando limpeza do banco de dados (Transações)...");
  try {
    // 1. Apagar todas as transações
    await db.delete(transactions);
    console.log("✅ Todas as transações foram apagadas.");

    // 2. Apagar logs de importação
    await db.delete(importLogs);
    console.log("✅ Logs de importação apagados.");

    // 3. Resetar saldo das contas bancárias
    await db.update(accounts).set({ currentBalance: '0' });
    console.log("✅ Saldo de todas as contas resetado para R$ 0,00.");

    console.log("\n🚀 Limpeza concluída com sucesso! Suas contas, cartões e categorias foram mantidos intactos.");
  } catch (error) {
    console.error("❌ Erro ao limpar banco de dados:", error);
  } finally {
    process.exit(0);
  }
}

main();
