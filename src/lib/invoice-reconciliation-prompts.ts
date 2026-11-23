import { ResponseSchema, SchemaType } from "@google/generative-ai";

export const INVOICE_RECONCILIATION_SYSTEM_PROMPT = `Você é um especialista em conciliação de faturas de cartão de crédito no Brasil.
Sua missão é analisar uma fatura bancária (PDF ou CSV) e compará-la com a lista de transações já cadastradas no aplicativo do usuário para a mesma fatura.

REGRAS CRÍTICAS DE CONCILIAÇÃO:
1. EXTRAÇÃO DA FATURA DO BANCO:
   - Extraia todas as compras, parcelas, assinaturas, IOF, juros/multas e eventuais estornos/créditos do ciclo atual.
   - IGNORE linhas de pagamento da fatura anterior, saldo anterior, limite disponível ou resumos informativos (ex: "Pagamento recebido", "Pagamento efetuado", "Saldo anterior").
   - Para estornos/descontos/créditos na fatura do ciclo atual, represente o valor como negativo (ex: -25.90).
   - Se a fatura informar o valor total líquido do ciclo no cabeçalho/resumo, preencha 'invoiceTotal' com esse valor; caso contrário, preencha com a soma dos lançamentos extraídos.

2. PRIORIDADE DE CRUZAMENTO (MATCHING):
   - O usuário frequentemente lança despesas no app com nomes amigáveis (ex: "Almoço iFood", "Uber trabalho", "Mercado Livre") enquanto o banco exibe o nome da maquininha/gateway (ex: "IFD*RESTAURANTE", "UBER *TRIP", "PG *MERCADOLIVRE").
   - Além disso, a data no app pode divergir em alguns dias da data de processamento/compensação na fatura.
   - Portanto, PRIORIZE:
     1º) VALOR: Correspondência exata ou diferença máxima de R$ 0,05.
     2º) PARCELA E CONTEXTO SEMÂNTICO: Número de parcela (ex: "2/6" vs "PARC 02/06") e relação semântica entre a descrição do banco e a do app.
     3º) DATA: Proximidade de data como critério de desempate quando houver dois itens com exatamente o mesmo valor.
   - Cada 'appTransactionId' pode ser vinculado a NO MÁXIMO UM lançamento da fatura (relação 1-para-1).

3. CLASSIFICAÇÃO OBRIGATÓRIA:
   - 'matched': Lançamentos da fatura que correspondem a uma transação existente no app.
   - 'toAdd': Lançamentos presentes na fatura do banco que NÃO existem no app (faltam no app). Sugira a melhor categoria ('suggestedCategoryId') e subcategoria ('suggestedSubcategoryId') com base na lista fornecida. Formate a descrição de forma limpa e legível em português.
   - 'toRemove': Transações existentes no app que NÃO foram encontradas na fatura do banco (sobram no app).

4. FORMATO DE DATAS:
   - Use sempre o formato YYYY-MM-DD.`;

export const invoiceReconciliationResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    invoiceTotal: {
      type: SchemaType.NUMBER,
      description: "Valor total da fatura extraído do documento (ou soma dos itens extraídos).",
    },
    matched: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          appTransactionId: { type: SchemaType.INTEGER },
          bankDescription: { type: SchemaType.STRING },
          bankDate: { type: SchemaType.STRING },
          bankAmount: { type: SchemaType.NUMBER },
          confidence: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["high", "medium", "low"],
          },
          reason: { type: SchemaType.STRING },
        },
        required: [
          "appTransactionId",
          "bankDescription",
          "bankDate",
          "bankAmount",
          "confidence",
          "reason",
        ],
      },
    },
    toAdd: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER },
          date: { type: SchemaType.STRING },
          suggestedCategoryId: { type: SchemaType.INTEGER, nullable: true },
          suggestedSubcategoryId: { type: SchemaType.INTEGER, nullable: true },
          installmentCurrent: { type: SchemaType.INTEGER, nullable: true },
          installmentTotal: { type: SchemaType.INTEGER, nullable: true },
          reason: { type: SchemaType.STRING },
        },
        required: ["description", "amount", "date", "reason"],
      },
    },
    toRemove: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          appTransactionId: { type: SchemaType.INTEGER },
          reason: { type: SchemaType.STRING },
        },
        required: ["appTransactionId", "reason"],
      },
    },
  },
  required: ["invoiceTotal", "matched", "toAdd", "toRemove"],
};
