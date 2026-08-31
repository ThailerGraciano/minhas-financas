# DB - Categories

## Descrição
Guarda a estrutura de categorias para classificar despesas e receitas. 

## Relacionamentos
- Possui uma tabela filha chamada `subcategories` (`id`, `category_id`, `name`).
- Transações se ligam a categorias e subcategorias (veja [[DB - Transactions]]).
