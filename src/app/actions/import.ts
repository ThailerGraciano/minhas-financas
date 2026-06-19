'use server';

import { db } from '@/db';
import { transactions, importLogs, settings, categories, subcategories, accounts, creditCards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { parse, isValid, addMonths, format, getDate } from 'date-fns';
import crypto from 'crypto';

// Helper to generate import hash
function generateImportHash(description: string, amount: string, date: string, accountOrCardName: string, extra: string = ''): string {
  const hashStr = `${description.trim().toLowerCase()}|${amount}|${date}|${accountOrCardName.trim().toLowerCase()}${extra ? '|' + extra : ''}`;
  return crypto.createHash('sha256').update(hashStr).digest('hex');
}

// Helper to parse installments from description
function parseInstallments(description: string) {
  const match = description.match(/(.*?)\s+(\d{1,3})\/(\d{1,3})\s*$/);
  if (match) {
    return {
      cleanDescription: match[1].trim(),
      installmentCurrent: parseInt(match[2], 10),
      installmentTotal: parseInt(match[3], 10)
    };
  }
  return { cleanDescription: description.trim(), installmentCurrent: null, installmentTotal: null };
}

type ImportType = 'expense' | 'income' | 'transfer';

// Helper to calculate competency month
function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), 'yyyy-MM');
  }
  return format(date, 'yyyy-MM');
}

// Helper to parse dates
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  let parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (isValid(parsed)) return parsed;
  parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  return null;
}

// Helper to parse amount
function parseAmount(amountStr: string): string {
  if (!amountStr) return '0';
  let cleaned = amountStr.replace(/[R$\s]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? '0' : Math.abs(parsed).toString();
}

type DbState = {
  accountsMap: Map<string, number>;
  cardsMap: Map<string, number>;
  categoriesMap: Map<string, number>;
  subcategoriesMap: Map<string, number>;
};

async function getOrCreateAccount(name: string, dbState: DbState) {
  const lowerName = name.toLowerCase();
  if (dbState.accountsMap.has(lowerName)) {
    return dbState.accountsMap.get(lowerName)!;
  }
  const [newAcc] = await db.insert(accounts).values({
    name: name,
    type: 'checking',
  }).returning();
  dbState.accountsMap.set(lowerName, newAcc.id);
  return newAcc.id;
}

async function getOrCreateCard(name: string, closingDay: number, dbState: DbState) {
  const lowerName = name.toLowerCase();
  if (dbState.cardsMap.has(lowerName)) {
    return dbState.cardsMap.get(lowerName)!;
  }
  const [newCard] = await db.insert(creditCards).values({
    name: name,
    creditLimit: '0',
    closingDay,
    dueDay: 10,
  }).returning();
  dbState.cardsMap.set(lowerName, newCard.id);
  return newCard.id;
}

async function getOrCreateCategory(catName: string, subName: string | undefined, transactionType: string, dbState: DbState) {
  let categoryId = null;
  const lowerCat = catName.toLowerCase();
  
  if (dbState.categoriesMap.has(lowerCat)) {
    categoryId = dbState.categoriesMap.get(lowerCat)!;
  } else {
    const [newCat] = await db.insert(categories).values({
      name: catName,
      type: transactionType === 'transfer' ? 'expense' : transactionType,
    }).returning();
    dbState.categoriesMap.set(lowerCat, newCat.id);
    categoryId = newCat.id;

    const [newSub] = await db.insert(subcategories).values({
      name: 'Geral',
      categoryId: newCat.id,
    }).returning();
    dbState.subcategoriesMap.set(`${newCat.id}_geral`, newSub.id);
  }

  let subcategoryId = null;
  if (subName) {
    const lowerSub = subName.toLowerCase();
    const key = `${categoryId}_${lowerSub}`;
    if (dbState.subcategoriesMap.has(key)) {
      subcategoryId = dbState.subcategoriesMap.get(key)!;
    } else {
      const [newSub] = await db.insert(subcategories).values({
        name: subName,
        categoryId,
      }).returning();
      dbState.subcategoriesMap.set(key, newSub.id);
      subcategoryId = newSub.id;
    }
  } else {
    const key = `${categoryId}_geral`;
    if (dbState.subcategoriesMap.has(key)) {
      subcategoryId = dbState.subcategoriesMap.get(key)!;
    }
  }

  return { categoryId, subcategoryId };
}

// PROCESS EXPENSES
async function processExpenses(rows: Record<string, string>[], dbState: DbState, closingDay: number, filename: string) {
  const transactionsToInsert: typeof transactions.$inferInsert[] = [];
  const errorsDetail: { row: number; data: Record<string, string>; error: string }[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2;
    try {
      const getCol = (possibleNames: string[]) => {
        const key = Object.keys(row).find(k => possibleNames.includes(k.toUpperCase().trim()));
        return key ? row[key]?.trim() : '';
      };

      const vencimentoStr = getCol(['VENCIMENTO', 'DATA']);
      const efetivacaoStr = getCol(['EFETIVAÇÃO', 'EFETIVACAO', 'PAGAMENTO']);
      const descricao = getCol(['DESCRIÇÃO', 'DESCRICAO', 'NOME', 'HISTÓRICO', 'HISTORICO']) || '';
      const { cleanDescription, installmentCurrent, installmentTotal } = parseInstallments(descricao);
      const valorStr = getCol(['VALOR', 'QUANTIA', 'SAÍDA']);
      let cartaoName = getCol(['CARTÃO', 'CARTAO']);
      if (cartaoName === '-') cartaoName = '';
      
      let contaName = getCol(['CONTA', 'BANCO']);
      if (contaName === '-') contaName = '';
      const categoriaName = getCol(['CATEGORIA']);
      const subcategoriaName = getCol(['SUBCATEGORIA']);

      const dataVencimento = parseDate(vencimentoStr);
      if (!dataVencimento) throw new Error(`Data de Vencimento inválida ou não encontrada.`);
      
      const competencyMonth = getCompetencyMonth(dataVencimento, closingDay);
      const dataEfetivacao = parseDate(efetivacaoStr);
      const status = dataEfetivacao ? 'paid' : 'pending';
      const paidAt = dataEfetivacao || null;
      const amount = parseAmount(valorStr);

      let accountId = null;
      let creditCardId = null;
      
      // Resolve CARTÃO (se preenchido)
      if (cartaoName) {
        creditCardId = await getOrCreateCard(cartaoName, closingDay, dbState);
      }

      // Resolve CONTA (sempre que preenchido, mesmo com cartão)
      if (contaName) {
        accountId = await getOrCreateAccount(contaName, dbState);
      }

      if (!creditCardId && !accountId) {
        throw new Error('Conta ou Cartão não informado.');
      }

      if (!categoriaName) throw new Error('Categoria não informada.');
      const { categoryId, subcategoryId } = await getOrCreateCategory(categoriaName, subcategoriaName, 'expense', dbState);

      transactionsToInsert.push({
        type: creditCardId ? 'credit_card_expense' : 'expense',
        accountId,
        creditCardId,
        categoryId,
        subcategoryId,
        amount,
        description: cleanDescription || 'Despesa Importada',
        installmentCurrent,
        installmentTotal,
        date: format(dataVencimento, 'yyyy-MM-dd'),
        competencyMonth,
        status,
        paidAt,
        observations: `Importado do arquivo ${filename} - Linha ${rowIndex}`,
        importHash: generateImportHash(descricao || 'Despesa Importada', amount, dataVencimento.toISOString(), cartaoName || contaName || ''),
      });
    } catch (err: unknown) {
      errorsDetail.push({ row: rowIndex, data: row, error: err instanceof Error ? err.message : String(err) });
    }
  }

  let skippedRows = 0;
  let successRows = 0;

  if (transactionsToInsert.length > 0) {
    await db.transaction(async (tx) => {
      const result = await tx.insert(transactions)
        .values(transactionsToInsert)
        .onConflictDoNothing({ target: transactions.importHash })
        .returning({ id: transactions.id });
      successRows = result.length;
      skippedRows = transactionsToInsert.length - result.length;
    });
  }
  return { successRows, skippedRows, errorsDetail };
}

// PROCESS INCOMES
async function processIncomes(rows: Record<string, string>[], dbState: DbState, closingDay: number, filename: string) {
  const transactionsToInsert: typeof transactions.$inferInsert[] = [];
  const errorsDetail: { row: number; data: Record<string, string>; error: string }[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2;
    try {
      const getCol = (possibleNames: string[]) => {
        const key = Object.keys(row).find(k => possibleNames.includes(k.toUpperCase().trim()));
        return key ? row[key]?.trim() : '';
      };

      const vencimentoStr = getCol(['VENCIMENTO', 'DATA']);
      const efetivacaoStr = getCol(['EFETIVAÇÃO', 'EFETIVACAO', 'PAGAMENTO']);
      const descricao = getCol(['DESCRIÇÃO', 'DESCRICAO', 'NOME', 'HISTÓRICO', 'HISTORICO']) || '';
      const { cleanDescription, installmentCurrent, installmentTotal } = parseInstallments(descricao);
      const valorStr = getCol(['VALOR', 'QUANTIA', 'ENTRADA']);
      let contaName = getCol(['CONTA', 'BANCO']);
      if (contaName === '-') contaName = '';
      const categoriaName = getCol(['CATEGORIA']);
      const subcategoriaName = getCol(['SUBCATEGORIA']);

      const dataVencimento = parseDate(vencimentoStr);
      if (!dataVencimento) throw new Error(`Data de Vencimento inválida ou não encontrada.`);
      
      const competencyMonth = getCompetencyMonth(dataVencimento, closingDay);
      const dataEfetivacao = parseDate(efetivacaoStr);
      const status = dataEfetivacao ? 'paid' : 'pending';
      const paidAt = dataEfetivacao || null;
      const amount = parseAmount(valorStr);

      if (!contaName) throw new Error('Conta não informada.');
      const accountId = await getOrCreateAccount(contaName, dbState);

      if (!categoriaName) throw new Error('Categoria não informada.');
      const { categoryId, subcategoryId } = await getOrCreateCategory(categoriaName, subcategoriaName, 'income', dbState);

      transactionsToInsert.push({
        type: 'income',
        accountId,
        creditCardId: null,
        categoryId,
        subcategoryId,
        amount,
        description: cleanDescription || 'Receita Importada',
        installmentCurrent,
        installmentTotal,
        date: format(dataVencimento, 'yyyy-MM-dd'),
        competencyMonth,
        status,
        paidAt,
        observations: `Importado do arquivo ${filename} - Linha ${rowIndex}`,
        importHash: generateImportHash(descricao || 'Receita Importada', amount, dataVencimento.toISOString(), contaName || ''),
      });
    } catch (err: unknown) {
      errorsDetail.push({ row: rowIndex, data: row, error: err instanceof Error ? err.message : String(err) });
    }
  }

  let skippedRows = 0;
  let successRows = 0;

  if (transactionsToInsert.length > 0) {
    await db.transaction(async (tx) => {
      const result = await tx.insert(transactions)
        .values(transactionsToInsert)
        .onConflictDoNothing({ target: transactions.importHash })
        .returning({ id: transactions.id });
      successRows = result.length;
      skippedRows = transactionsToInsert.length - result.length;
    });
  }
  return { successRows, skippedRows, errorsDetail };
}

// PROCESS TRANSFERS
async function processTransfers(rows: Record<string, string>[], dbState: DbState, closingDay: number, filename: string) {
  let successRows = 0;
  let skippedRows = 0;
  const errorsDetail: { row: number; data: Record<string, string>; error: string }[] = [];
  
  // Vamos buscar a categoria padrão de transferências, ou criá-la se não existir.
  const { categoryId: transferCategoryId, subcategoryId: transferSubcategoryId } = 
    await getOrCreateCategory('Transferência', 'Geral', 'transfer', dbState);

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;
      try {
        const getCol = (possibleNames: string[]) => {
          const key = Object.keys(row).find(k => possibleNames.includes(k.toUpperCase().trim()));
          return key ? row[key]?.trim() : '';
        };

        const vencimentoStr = getCol(['VENCIMENTO', 'DATA']);
        const efetivacaoStr = getCol(['EFETIVAÇÃO', 'EFETIVACAO', 'PAGAMENTO']);
        const descricao = getCol(['DESCRIÇÃO', 'DESCRICAO', 'NOME', 'HISTÓRICO', 'HISTORICO']);
        const valorStr = getCol(['VALOR', 'QUANTIA']);
        let origemName = getCol(['ORIGEM', 'CONTA ORIGEM', 'SAÍDA']);
        if (origemName === '-') origemName = '';
        let destinoName = getCol(['DESTINO', 'CONTA DESTINO', 'ENTRADA']);
        if (destinoName === '-') destinoName = '';

        const dataVencimento = parseDate(vencimentoStr);
        if (!dataVencimento) throw new Error(`Data de Vencimento inválida ou não encontrada.`);
        
        const competencyMonth = getCompetencyMonth(dataVencimento, closingDay);
        const dataEfetivacao = parseDate(efetivacaoStr);
        const status = dataEfetivacao ? 'paid' : 'pending';
        const paidAt = dataEfetivacao || null;
        const amount = parseAmount(valorStr);

        if (!origemName || !destinoName) throw new Error('Contas de origem e destino são obrigatórias.');

        const originAccountId = await getOrCreateAccount(origemName, dbState);
        const destAccountId = await getOrCreateAccount(destinoName, dbState);

        const observationsText = `Importado do arquivo ${filename} - Linha ${rowIndex}`;

        const hashOut = generateImportHash(descricao || 'Transferência (Saída)', amount, dataVencimento.toISOString(), origemName || '', 'out');
        const hashIn = generateImportHash(descricao || 'Transferência (Entrada)', amount, dataVencimento.toISOString(), destinoName || '', 'in');

        // Insere a saída (origin)
        const outTxResult = await tx.insert(transactions).values({
          type: 'transfer',
          accountId: originAccountId,
          creditCardId: null,
          categoryId: transferCategoryId,
          subcategoryId: transferSubcategoryId,
          amount: amount, // O app trata saída/entrada por lógica, mas o type é transfer
          description: descricao || 'Transferência (Saída)',
          date: format(dataVencimento, 'yyyy-MM-dd'),
          competencyMonth,
          status,
          paidAt,
          observations: observationsText,
          importHash: hashOut,
        }).onConflictDoNothing({ target: transactions.importHash }).returning({ id: transactions.id });

        if (outTxResult.length === 0) {
          skippedRows++;
          continue;
        }
        
        const outTx = outTxResult[0];

        // Insere a entrada (destination) vinculada à saída (parent_transaction_id = transfer_pair_id)
        await tx.insert(transactions).values({
          type: 'transfer',
          accountId: destAccountId,
          creditCardId: null,
          categoryId: transferCategoryId,
          subcategoryId: transferSubcategoryId,
          amount: amount,
          description: descricao || 'Transferência (Entrada)',
          date: format(dataVencimento, 'yyyy-MM-dd'),
          competencyMonth,
          status,
          paidAt,
          parentTransactionId: outTx.id,
          observations: observationsText,
          importHash: hashIn,
        });

        successRows++; // Conta como 1 par importado com sucesso
      } catch (err: unknown) {
        errorsDetail.push({ row: rowIndex, data: row, error: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  return { successRows, skippedRows, errorsDetail };
}

export async function importCSV(csvString: string, type: ImportType, filename: string) {
  try {
    const parsedCSV = Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedCSV.errors.length > 0 && parsedCSV.data.length === 0) {
      return { success: false, error: 'Falha ao processar o CSV ou arquivo vazio.' };
    }

    const rows = parsedCSV.data;
    const totalRows = rows.length;

    const [appSettings] = await db.select().from(settings).limit(1);
    const closingDay = appSettings?.closingDay || 25;

    // Load initial map states
    const existingAccounts = await db.select().from(accounts);
    const accountsMap = new Map(existingAccounts.map(a => [a.name.toLowerCase(), a.id]));
    const existingCards = await db.select().from(creditCards);
    const cardsMap = new Map(existingCards.map(c => [c.name.toLowerCase(), c.id]));
    const existingCategories = await db.select().from(categories);
    const categoriesMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));
    const existingSubcategories = await db.select().from(subcategories);
    const subcategoriesMap = new Map(existingSubcategories.map(s => [`${s.categoryId}_${s.name.toLowerCase()}`, s.id]));

    const dbState: DbState = { accountsMap, cardsMap, categoriesMap, subcategoriesMap };

    let result = { successRows: 0, skippedRows: 0, errorsDetail: [] as { row: number; data: Record<string, string>; error: string }[] };

    switch (type) {
      case 'expense':
        result = await processExpenses(rows, dbState, closingDay, filename);
        break;
      case 'income':
        result = await processIncomes(rows, dbState, closingDay, filename);
        break;
      case 'transfer':
        result = await processTransfers(rows, dbState, closingDay, filename);
        break;
      default:
        throw new Error('Tipo de importação inválido.');
    }

    const successRows = result.successRows;
    const skippedRows = result.skippedRows;
    const errorRows = result.errorsDetail.length;

    await db.insert(importLogs).values({
      filename,
      totalRows,
      successRows,
      skippedRows,
      errorRows,
      errorsDetail: result.errorsDetail.length > 0 ? result.errorsDetail : null,
    });

    revalidatePath('/transactions');
    revalidatePath('/');
    
    return { 
      success: true, 
      result: {
        totalRows,
        successRows,
        skippedRows,
        errorRows,
        errorsDetail: result.errorsDetail
      } 
    };

  } catch (error: unknown) {
    console.error('Error importing CSV:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao processar o arquivo CSV' };
  }
}
