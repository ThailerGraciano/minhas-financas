# Tela Categorias e Subcategorias

Rota: `/categories`

## Objetivo
Configurar a árvore de classificação das transações.

## Funcionalidades
- Criar e gerenciar Categorias PAI (ex: Alimentação).
- Criar Subcategorias filhas (ex: Supermercado, Restaurante).
- Usado intensamente no momento de criar uma transação (veja [[DB - Categories]]).

## Arquivos Relacionados
- `src/app/(main)/categories/*`
- `src/app/actions/categories.ts`
