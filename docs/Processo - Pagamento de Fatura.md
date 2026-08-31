# Processo - Pagamento de Fatura

## Descrição
Rotina de quitar a fatura de um [[DB - Credit Cards]].

## Regras de Negócio
- As compras no cartão de crédito afetam o limite disponível, mas não saem da conta bancária na hora.
- Ao realizar o Pagamento da Fatura, é gerada uma despesa na conta origem ([[DB - Accounts]]) com o valor pago.
- O `status` das transações do cartão atreladas àquela competência mudam de `pending` para `paid` (ver [[DB - Transactions]]).
- O limite do cartão é restabelecido de acordo com o valor pago.
