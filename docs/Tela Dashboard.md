# Tela Dashboard

A tela principal do sistema (rota `/`). 

## Objetivo
Exibir um resumo financeiro atualizado para o usuário, respeitando o [[Processo - Período de Competência]]. 

## Componentes Principais
- Resumo de saldos (consultando [[DB - Accounts]]).
- Total de receitas e despesas do mês atual (consultando [[DB - Transactions]]).
- Gráficos de categorias (relacionando [[DB - Categories]] e transações).

## Arquivos Relacionados
- `src/app/(main)/dashboard-client-page.tsx`
- `src/app/actions/dashboard.ts` e `dashboard-full.ts`
