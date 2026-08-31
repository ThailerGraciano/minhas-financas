# DB - Transactions

## Descrição
O coração financeiro do sistema. Tudo que movimenta dinheiro está aqui.

## Campos Principais
- `id`: UUID
- `type`: Enum (income, expense, transfer, credit_card_expense)
- `account_id`: FK para [[DB - Accounts]]
- `credit_card_id`: FK para [[DB - Credit Cards]] (se houver)
- `category_id` e `subcategory_id`: FKs
- `amount`: Valor
- `date`: Data da transação
- `competency_month`: Mês de referência em formato `YYYY-MM` (Ligado ao [[Processo - Período de Competência]])
- `status`: `pending` ou `paid`
- `is_fixed`: Booleano para [[Processo - Transações Parceladas e Fixas]]
- `installment_current` e `installment_total`: Controle de parcelas
- `parent_transaction_id`: Para vincular parcelas à mesma compra original.
