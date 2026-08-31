# Processo - Transferências entre Contas

## Descrição
Quando o usuário move dinheiro entre duas contas ([[DB - Accounts]]).

## Regras de Negócio
- A transferência não é apenas um registro visual. Ela precisa afetar o `current_balance` de **duas** contas simultaneamente.
- Em caso de sucesso, abate o valor da conta Origem e soma na conta Destino.
- Essa operação deve ocorrer de forma atômica (Transaction de DB) usando Drizzle ORM nas Server Actions, garantindo que se uma falhar, a outra seja revertida.
