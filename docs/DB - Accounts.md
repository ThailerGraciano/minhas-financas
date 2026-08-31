# DB - Accounts

## Descrição
Armazena as contas bancárias (checking, savings) e carteiras manuais (wallet) do usuário.

## Campos Principais
- `id`: UUID
- `name`: Nome da conta
- `type`: Enum (checking, savings, wallet)
- `current_balance`: Saldo atual da conta. Atualizado por receitas, despesas e [[Processo - Transferências entre Contas]].
