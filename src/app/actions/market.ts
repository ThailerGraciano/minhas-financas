'use server';

import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { z } from 'zod';
import { db } from '@/db';
import { marketReceipts, marketItems, marketReceiptTransactions, transactions, settings } from '@/db/schema';
import { desc, inArray, eq, and, gte, lte } from 'drizzle-orm';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { auth } from '@/auth';
import { subMonths, parse, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const receiptItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_measure: z.string(),
  category: z.string(),
  unit_price: z.number(),
  original_price: z.number(),
  discount_amount: z.number(),
  net_price: z.number(),
});

const receiptSchema = z.object({
  storeName: z.string(),
  date: z.string(),
  items: z.array(receiptItemSchema),
});

export type MarketReceiptItem = z.infer<typeof receiptItemSchema>;
export type MarketReceiptData = z.infer<typeof receiptSchema>;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    storeName: { type: SchemaType.STRING },
    date: { type: SchemaType.STRING },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit_measure: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          unit_price: { type: SchemaType.NUMBER },
          original_price: { type: SchemaType.NUMBER },
          discount_amount: { type: SchemaType.NUMBER },
          net_price: { type: SchemaType.NUMBER },
        },
        required: ['description', 'quantity', 'unit_measure', 'category', 'unit_price', 'original_price', 'discount_amount', 'net_price'],
      },
    },
  },
  required: ['storeName', 'date', 'items'],
};

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export type MarketReceiptInput = 
  | { type: 'image'; base64: string; mimeType: string }
  | { type: 'text'; text: string };

export async function processMarketReceipt(input: MarketReceiptInput): Promise<{
  success: true;
  data: MarketReceiptData;
} | {
  success: false;
  error: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    let result;

    if (input.type === 'text') {
      result = await model.generateContent(input.text);
    } else {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.base64,
          },
        },
        'Extraia os dados deste cupom fiscal.',
      ]);
    }

    const response = result.response;
    const text = response.text();

    const parsed: unknown = JSON.parse(text);
    const validated = receiptSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: `Resposta da IA em formato inválido: ${err.issues.map(e => e.message).join(', ')}`,
      };
    }
    if (err instanceof SyntaxError) {
      return { success: false, error: 'A IA retornou uma resposta que não é um JSON válido.' };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Erro desconhecido ao processar o cupom fiscal.' };
  }
}

export async function getRecentMarketTransactions() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const recent = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type,
    })
    .from(transactions)
    .where(and(inArray(transactions.type, ['expense', 'credit_card_expense']), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(30);
  
  return recent;
}

export async function saveMarketReceipt(
  receiptData: MarketReceiptData, 
  selectedTransactionIds: number[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const totalAmount = receiptData.items.reduce((acc, item) => acc + (Number(item.net_price) || 0), 0);

    await db.transaction(async (tx) => {
      const [receipt] = await tx.insert(marketReceipts).values({
        userId,
        storeName: receiptData.storeName,
        date: new Date(receiptData.date),
        totalAmount: totalAmount.toString(),
      }).returning({ id: marketReceipts.id });

      const itemsToInsert = receiptData.items.map(item => ({
        receiptId: receipt.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitMeasure: item.unit_measure,
        category: item.category,
        unitPrice: item.unit_price.toString(),
        originalPrice: item.original_price.toString(),
        discountAmount: item.discount_amount.toString(),
        netPrice: item.net_price.toString(),
      }));

      if (itemsToInsert.length > 0) {
        await tx.insert(marketItems).values(itemsToInsert);
      }

      if (selectedTransactionIds.length > 0) {
        const links = selectedTransactionIds.map(tid => ({
          receiptId: receipt.id,
          transactionId: tid,
        }));
        await tx.insert(marketReceiptTransactions).values(links);
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Erro ao salvar cupom:', err);
    return { success: false, error: 'Erro interno ao salvar no banco de dados.' };
  }
}

async function getClosingDay(userId: string) {
  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
  return userSettings?.closingDay || 25;
}

function getCompetencyDateRange(competencyMonth: string, closingDay: number) {
  const [year, month] = competencyMonth.split('-').map(Number);
  const startDate = new Date(year, month - 2, closingDay + 1, 0, 0, 0);
  const endDate = new Date(year, month - 1, closingDay, 23, 59, 59, 999);
  return { startDate, endDate };
}

export async function getMarketReceipts(competencyMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const closingDay = await getClosingDay(userId);
  const { startDate, endDate } = getCompetencyDateRange(competencyMonth, closingDay);

  return await db
    .select()
    .from(marketReceipts)
    .where(
      and(
        eq(marketReceipts.userId, userId),
        gte(marketReceipts.date, startDate),
        lte(marketReceipts.date, endDate)
      )
    )
    .orderBy(desc(marketReceipts.date));
}

export async function getMarketReceiptDetails(receiptId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Validate ownership
  const [receipt] = await db
    .select()
    .from(marketReceipts)
    .where(and(eq(marketReceipts.id, receiptId), eq(marketReceipts.userId, userId)));

  if (!receipt) throw new Error("Receipt not found");

  return await db
    .select()
    .from(marketItems)
    .where(eq(marketItems.receiptId, receiptId));
}

export async function getMarketDashboardData(competencyMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const closingDay = await getClosingDay(userId);
  const { startDate, endDate } = getCompetencyDateRange(competencyMonth, closingDay);

  const receipts = await db
    .select()
    .from(marketReceipts)
    .where(
      and(
        eq(marketReceipts.userId, userId),
        gte(marketReceipts.date, startDate),
        lte(marketReceipts.date, endDate)
      )
    );

  const totalSpent = receipts.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  if (receipts.length === 0) {
    return {
      totalSpent: 0,
      totalDiscount: 0,
      spendingByCategory: [],
      topExpensiveItems: [],
      itemsByCategory: [],
      topItemsByCategory: [],
    };
  }

  const receiptIds = receipts.map(r => r.id);

  const items = await db
    .select()
    .from(marketItems)
    .where(inArray(marketItems.receiptId, receiptIds));

  const totalDiscount = items.reduce((acc, curr) => acc + Number(curr.discountAmount), 0);

  const categoryMap = new Map<string, number>();
  const categoryCountMap = new Map<string, number>();
  
  items.forEach(item => {
    const cat = item.category || 'Outros';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(item.netPrice));
    categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + Number(item.quantity));
  });

  const spendingByCategory = Array.from(categoryMap.entries()).map(([category, value]) => ({
    category,
    value,
  })).sort((a, b) => b.value - a.value);

  const itemsByCategory = Array.from(categoryCountMap.entries()).map(([category, count]) => ({
    category,
    count,
  })).sort((a, b) => b.count - a.count);

  const itemMap = new Map<string, { description: string, netPrice: number, quantity: number, unitMeasure: string }>();
  items.forEach(item => {
    const key = `${item.description}|${item.unitMeasure}`;
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        description: item.description,
        netPrice: Number(item.netPrice),
        quantity: Number(item.quantity),
        unitMeasure: item.unitMeasure
      });
    } else {
      const existing = itemMap.get(key)!;
      existing.netPrice += Number(item.netPrice);
      existing.quantity += Number(item.quantity);
    }
  });

  const topExpensiveItems = Array.from(itemMap.values())
    .sort((a, b) => b.netPrice - a.netPrice)
    .slice(0, 5);

  const categoryItemsMap = new Map<string, { description: string, netPrice: number, quantity: number, unitMeasure: string }[]>();
  items.forEach(item => {
    const cat = item.category || 'Outros';
    if (!categoryItemsMap.has(cat)) {
      categoryItemsMap.set(cat, []);
    }
    const catItems = categoryItemsMap.get(cat)!;
    
    const existing = catItems.find(i => i.description === item.description && i.unitMeasure === item.unitMeasure);
    if (existing) {
      existing.netPrice += Number(item.netPrice);
      existing.quantity += Number(item.quantity);
    } else {
      catItems.push({
        description: item.description,
        netPrice: Number(item.netPrice),
        quantity: Number(item.quantity),
        unitMeasure: item.unitMeasure
      });
    }
  });

  const topItemsByCategory = Array.from(categoryItemsMap.entries()).map(([category, catItems]) => {
    return {
      category,
      items: catItems.sort((a, b) => b.netPrice - a.netPrice).slice(0, 3)
    };
  }).sort((a, b) => b.items.reduce((acc, curr) => acc + curr.netPrice, 0) - a.items.reduce((acc, curr) => acc + curr.netPrice, 0));

  return {
    totalSpent,
    totalDiscount,
    spendingByCategory,
    topExpensiveItems,
    itemsByCategory,
    topItemsByCategory,
  };
}

export async function getMarketCategoryHistory(competencyMonth: string, monthsCount: number = 3) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const closingDay = await getClosingDay(userId);
  
  const baseDate = parse(competencyMonth, 'yyyy-MM', new Date());
  const startCompetencyDate = subMonths(baseDate, monthsCount - 1);
  const startCompetencyMonth = format(startCompetencyDate, 'yyyy-MM');
  
  const { startDate } = getCompetencyDateRange(startCompetencyMonth, closingDay);
  const { endDate } = getCompetencyDateRange(competencyMonth, closingDay);

  const receipts = await db
    .select()
    .from(marketReceipts)
    .where(
      and(
        eq(marketReceipts.userId, userId),
        gte(marketReceipts.date, startDate),
        lte(marketReceipts.date, endDate)
      )
    );

  // Initialize the timeline array with 0 for all months so we have a consistent X-axis
  const timelineMap = new Map<string, Record<string, string | number>>();
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = subMonths(baseDate, i);
    const monthKey = format(d, 'MMM/yy', { locale: ptBR });
    const formattedMonth = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    timelineMap.set(formattedMonth, { month: formattedMonth });
  }

  if (receipts.length > 0) {
    const receiptIds = receipts.map(r => r.id);
    const items = await db
      .select()
      .from(marketItems)
      .where(inArray(marketItems.receiptId, receiptIds));

    const receiptToMonthMap = new Map<string, string>();
    receipts.forEach(r => {
      let monthDate = r.date;
      if (r.date.getDate() > closingDay) {
        monthDate = addMonths(r.date, 1);
      }
      const monthKey = format(monthDate, 'MMM/yy', { locale: ptBR });
      receiptToMonthMap.set(r.id, monthKey.charAt(0).toUpperCase() + monthKey.slice(1));
    });

    items.forEach(item => {
      const monthLabel = receiptToMonthMap.get(item.receiptId);
      if (monthLabel && timelineMap.has(monthLabel)) {
        const monthData = timelineMap.get(monthLabel)!;
        const cat = item.category || 'Outros';
        monthData[cat] = (Number(monthData[cat]) || 0) + Number(item.netPrice);
      }
    });
  }

  return Array.from(timelineMap.values());
}
