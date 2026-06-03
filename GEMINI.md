# Contexto do Projeto: Minhas Finanças AI

## Stack Tecnológica

- Framework: Next.js (App Router)
- Linguagem: TypeScript
- Estilização: Tailwind CSS + shadcn/ui
- Banco de Dados: Supabase (PostgreSQL)
- ORM: Drizzle ORM
- Tema: Dark Mode padrão configurado (`next-themes`)

## Tipagem

Sempre busque a melhor tipagem para os objetos, nunca utilize any ou as unknown as

## Arquitetura

- **Comunicação de Dados:** Uso exclusivo de Next.js Server Actions para leitura e escrita no banco.
- **Segurança:** Chaves do Supabase via `.env.local` (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Regras de Negócio Core

1. **Período de Competência:**
   - O mês financeiro é guiado por um `closing_day` (padrão dia 25) salvo na tabela `settings`.
   - Consultas de dashboard e listagens devem filtrar considerando esse ciclo (ex: dia 26 de um mês até o dia 25 do outro).
2. **Contas e Cartões:**
   - Contas (checking, savings, wallet) controlam saldo (`current_balance`).
   - Cartões possuem limite, dia de fechamento e dia de vencimento.
   - Transferências entre contas devem atualizar o saldo das duas pontas simultaneamente.
   - Pagamento de fatura gera uma despesa na conta abatendo o valor do cartão.
3. **Despesas e Receitas (Fixas e Parceladas):**
   - Toda transação possui `status` (`pending`, `paid`) para controle de "dar baixa".
   - Transações fixas (`is_fixed: true`) se repetem nas próximas competências.
   - Transações parceladas possuem `installment_current` e `installment_total`.
   - A criação de uma compra parcelada deve gerar imediatamente as múltiplas transações no banco, replicando os meses subsequentes e vinculando-as por um `parent_transaction_id`.

## Schema do Banco de Dados Base

- `settings`: id, closing_day.
- `accounts`: id, name, type, current_balance.
- `categories`: id, name.
- `subcategories`: id, category_id, name.
- `credit_cards`: id, name, credit_limit, closing_day, due_day.
- `transactions`: id, type (income, expense, transfer, credit_card_expense), account_id, credit_card_id, category_id, subcategory_id, amount, description, date, competency_month (YYYY-MM), status, is_fixed, installment_current, installment_total, parent_transaction_id.

## Diretrizes de UI/UX

- **Mobile-First:** Navegação principal via Bottom Navigation em telas pequenas.
- **Desktop:** Oculta o Bottom Nav e exibe uma Sidebar (componente do shadcn).
- **Ações Rápidas:** Floating Action Button (FAB) global no canto inferior direito para abrir o modal de "Nova Transação".
- **Formulários:** Modal de nova transação dividido nas abas: Despesa, Receita e Transferência.
