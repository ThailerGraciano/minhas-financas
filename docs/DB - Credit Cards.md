# DB - Credit Cards

## Descrição
Guarda as informações de cartões de crédito.

## Campos Principais
- `id`: UUID
- `name`: Nome do cartão
- `credit_limit`: Limite de crédito do cartão
- `closing_day`: Dia de fechamento da fatura
- `due_day`: Dia de vencimento da fatura
- Lançamentos desse cartão geram registros em [[DB - Transactions]] e o acerto é feito via [[Processo - Pagamento de Fatura]].
