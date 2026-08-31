# Tela Contas

Rota: `/accounts`

## Objetivo
Gerenciar as contas bancárias e carteiras do usuário.

## Funcionalidades
- Listagem do saldo atual de cada conta.
- Criação e edição de contas.
- Ao registrar transações (receita/despesa), o saldo é afetado (veja [[DB - Accounts]] e [[DB - Transactions]]).

## Arquivos Relacionados
- `src/app/(main)/accounts/*`
- `src/app/actions/accounts.ts`
