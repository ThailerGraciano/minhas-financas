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

## Customização da Paleta de Cores & Temas (Como alterar facilmente)

O sistema possui uma arquitetura centralizada e modular em **dois pontos principais** para troca rápida de temas:

### 1. Modal de Transações (Midnight + Apple Liquid Glass)
- **Arquivo de Configuração:** `src/components/transaction-theme.ts`
- **Como alterar em 1 linha:** Mude a constante `ACTIVE_THEME`:
  ```typescript
  export const ACTIVE_THEME: ThemePreset = THEME_PRESETS.midnight_electric;
  ```
- **Presets Prontos Disponíveis:**
  - `midnight_electric`: Padrão atual Midnight `#0B1220` com Rosa Coral (`#FF7185`), Menta (`#42D6A0`) e Azul Cobalto (`#639BFF`).
  - `carbon_gold`: Estilo C6 Black com Ouro (`#FBBF24`), Rubro (`#F87171`) e Azul Suave (`#93C5FD`).
  - `emerald_banking`: Fundo grafite/esmeralda com Menta Intensa (`#10B981`) e Turquesa (`#38BDF8`).
- **Como criar um novo Preset:** Adicione um novo objeto ao `THEME_PRESETS` em `src/components/transaction-theme.ts` definindo as superfícies em `midnight` e os accents contextuais em `accents` (`expense`, `income`, `transfer`).

### 2. Paleta Global da Aplicação (Sidebar, Dashboard, Botões Gerais)
- **Arquivo de Configuração:** `src/app/globals.css`
- **Como alterar:** Modifique as variáveis principais no topo dos blocos `:root` e `.dark`:
  - `--primary`: Cor de destaque da marca (botões principais, FAB, indicador da sidebar e anéis de foco).
    - Ex: Laranja Original: `hsl(24 100% 50%)`
    - Ex: Azul Cobalto / Electric: `hsl(217 91% 60%)` ou `#639BFF`
    - Ex: Dourado C6 Carbon: `hsl(45 93% 47%)` ou `#FBBF24`
    - Ex: Esmeralda Wealth: `hsl(160 84% 39%)` ou `#10B981`
  - `--background`: Fundo principal das telas (ex: `hsl(240 10% 6%)` ou `#0B1220`).
  - `--card`: Superfície dos cartões comuns (ex: `hsl(240 8% 11%)` ou `#111A2A`).

### 3. Estrutura Modular do Modal de Transações
Para alterar ou customizar seções do modal individualmente, os componentes estão isolados em `src/components/transaction-form/`:
- `form-header.tsx`: Título, pílula de tipo, fechar e abas segmentadas.
- `amount-card.tsx`: Valor numérico formatado (`CurrencyInput`) e toggle de status (Pago/Recebido vs Pendente).
- `details-card.tsx`: Descrição, categorias/subcategorias com criação rápida e contas de transferência.
- `payment-card.tsx`: Liquidação (Conta vs Cartão de Crédito com limite e seleção de faturas).
- `dates-card.tsx`: Data de lançamento e data de vencimento sincronizadas.
- `recurrence-card.tsx`: Modalidade (Única, Fixa, Parcelada) e configurações de parcelamento.
- `form-footer.tsx`: Pílula com resumo dinâmico e botões de ação ("+ Adicionar outra" e "✓ Finalizar").
- `ambient-glow.tsx`: Efeito de iluminação difusa de profundidade atrás do modal.
- `closed-invoice-dialog.tsx`: Diálogo de confirmação para faturas de cartão já fechadas.
