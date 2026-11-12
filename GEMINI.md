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

O sistema possui uma **arquitetura unificada de tema** em um único ponto de controle para troca rápida da paleta em **100% da aplicação** (Sidebar, Dashboard, Modais, Cards, Botões, Badges e Gráficos):

### 1. Como Mudar o Tema Inteiro em 1 Linha
- **Arquivo de Configuração:** `src/components/transaction-theme.ts`
- **Linha para alterar:**
  ```typescript
  export const ACTIVE_THEME_ID: ThemeId = "obsidian_ultraviolet";
  ```
- O layout raiz (`src/app/layout.tsx`) injeta o atributo `data-theme={ACTIVE_THEME.id}` no `<html>`, aplicando automaticamente no `src/app/globals.css` todas as cores globais e semânticas.

### 2. Presets Prontos Disponíveis
- `obsidian_ultraviolet`: Padrão atual preto absoluto `#000000` (OLED) com detalhes Roxo Nubank Ultravioleta (`#820AD1`), Verde Menta (`#00D287`), Rosa Coral (`#FF4D6D`) e efeito Apple Liquid Glass em componentes de seleção.
- `midnight_electric`: Visual Midnight `#0B1220` com Rosa Coral (`#FF7185`), Menta (`#42D6A0`) e Azul Cobalto (`#639BFF`).
- `carbon_gold`: Estilo C6 Black com Ouro (`#FBBF24`), Rubro (`#F87171`) e Azul Suave (`#93C5FD`).
- `emerald_banking`: Fundo grafite/esmeralda com Menta Intensa (`#10B981`) e Turquesa (`#38BDF8`).
- `midnight_orange`: Estilo clássico Minhas Finanças com Laranja Neon (`#F97316`), Menta e Rosa.

### 3. Como Criar um Novo Preset
1. Adicione um novo objeto em `THEME_PRESETS` em `src/components/transaction-theme.ts` com suas superfícies e accents.
2. Adicione as variáveis CSS correspondentes sob `[data-theme="seu_id"]` em `src/app/globals.css`.
3. Altere `ACTIVE_THEME_ID = "seu_id"`.

### 4. Estrutura Modular do Modal de Transações
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
