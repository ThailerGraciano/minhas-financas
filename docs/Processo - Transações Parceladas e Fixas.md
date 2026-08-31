# Processo - Transações Parceladas e Fixas

## Descrição
O sistema permite criar lançamentos que se repetem (Fixos) ou que são divididos em várias faturas/meses (Parceladas).

## Regras de Transações Fixas
- Propriedade `is_fixed: true` em [[DB - Transactions]].
- Todo início de novo [[Processo - Período de Competência]], ou via cron/job de backend, o sistema replica essas transações para o próximo período.

## Regras de Transações Parceladas
- Ao invés de lançar tudo de uma vez, a compra é dividida.
- A criação de uma despesa parcelada gera **imediatamente** múltiplas linhas (registros) na tabela [[DB - Transactions]].
- Estas transações são conectadas através de um `parent_transaction_id`.
- Cada uma delas terá o campo `installment_current` indo de 1 até `installment_total`.
