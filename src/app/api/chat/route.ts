import { google } from '@ai-sdk/google';
import { streamText, createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { auth } from '@/auth';
import { getDashboardData, getIncomeVsExpenseData } from '@/app/actions/dashboard';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();

    // Fetch context data in parallel
    const [dashboardData, incomeVsExpense] = await Promise.all([
      getDashboardData(),
      getIncomeVsExpenseData(new Date().toISOString().substring(0, 7)), // current month yyyy-MM
    ]);

    const systemPrompt = `Você é o assistente financeiro IA do aplicativo "Minhas Finanças". Você deve ajudar o usuário a tomar melhores decisões financeiras, analisando seus dados, sugerindo cortes e elogiando o planejamento.
Seja sempre muito educado, informal, direto ao ponto e utilize emojis. Formate suas respostas em Markdown limpo (sem tags HTML, use listas e negritos normais).

**Contexto Financeiro do Mês Atual (${dashboardData.currentMonth}):**
- Saldo Atual Consolidado (Base): R$ ${dashboardData.totalBalance.toFixed(2)}
- Total de Receitas: R$ ${dashboardData.totalIncome.toFixed(2)}
- Total de Despesas: R$ ${dashboardData.totalExpense.toFixed(2)}

**Distribuição de Faturas (Cartões de Crédito no mês):**
${dashboardData.cardInvoices.length > 0 
  ? dashboardData.cardInvoices.map(c => `- ${c.card.name}: R$ ${c.invoiceTotal.toFixed(2)}`).join('\n') 
  : '- Nenhuma fatura de cartão ativa neste mês.'}

**Visão Geral (Receita vs Despesa):**
- Receita Geral: R$ ${incomeVsExpense.global.income.toFixed(2)}
- Despesa Geral: R$ ${incomeVsExpense.global.expense.toFixed(2)}
- Saldo Base Global: R$ ${incomeVsExpense.global.baseBalance.toFixed(2)}

**Regras de Resposta:**
- Não divulgue os números com precisão exata caso o usuário não os pergunte diretamente, mas use-os para sua análise de viabilidade (ex: "Vi que você gastou bastante, que tal...").
- Quando o usuário pedir análises, faça sugestões práticas (ex: "Se você cortar no cartão X...").
- Nunca diga que você é uma inteligência artificial ou modelo de linguagem, sempre atue como o Assistente do "Minhas Finanças".
- Não peça desculpas. Aja de forma proativa.
`;

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
      }),
    });
  } catch (error) {
    console.error('AI Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

