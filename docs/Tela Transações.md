# Tela Transações

Rota: `/transactions`

## Objetivo
Listar, filtrar e gerenciar todas as transações (Receitas, Despesas, Transferências).

## Funcionalidades
- Listagem paginada e filtrada de transações (baseada em [[Processo - Período de Competência]]).
- Acesso à edição de transações através das [[Ações Rápidas (FAB e Modais)]].
- Lida com transações normais, parceladas ([[Processo - Transações Parceladas e Fixas]]) e transferências ([[Processo - Transferências entre Contas]]).

## Arquivos Relacionados
- `src/app/(main)/transactions/transaction-list.tsx`
- `src/app/actions/transactions.ts`
