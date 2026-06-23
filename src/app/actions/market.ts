'use server';

import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { z } from 'zod';
import { db } from '@/db';
import { marketReceipts, marketItems, marketReceiptTransactions, transactions } from '@/db/schema';
import { desc, inArray, eq } from 'drizzle-orm';
import { SYSTEM_PROMPT } from '@/lib/prompts';

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
      // Text input (pasted receipt text)
      result = await model.generateContent(input.text);
    } else {
      // Image file (already base64 from client)
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
  const recent = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type,
    })
    .from(transactions)
    .where(inArray(transactions.type, ['expense', 'credit_card_expense']))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(30);
  
  return recent;
}

export async function saveMarketReceipt(
  receiptData: MarketReceiptData, 
  selectedTransactionIds: number[]
) {
  try {
    const totalAmount = receiptData.items.reduce((acc, item) => acc + (Number(item.net_price) || 0), 0);

    await db.transaction(async (tx) => {
      const [receipt] = await tx.insert(marketReceipts).values({
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
