# Análise Completa do Modal de Criação de Transação (`TransactionFormDialog`)

> **Arquivo Principal:** `src/components/transaction-form-dialog.tsx`  
> ** Componentes Auxiliares:** `src/components/quick-category-dialog.tsx`  
> **Server Actions:** `src/app/actions/form-data.ts` e `src/app/actions/transactions.ts`

---

## 1. Hierarquia de Controle ("O que manda em quê")

O modal funciona como um **Wizard dinâmico de até 6 passos**, onde escolhas feitas nos passos iniciais alteram os campos exibidos, calculam datas automaticamente e até **adicionam ou removem passos inteiros** do fluxo.

A ordem de comando (do nível mais alto para o mais específico) é:

```
1. ABA SELECIONADA (tab: Despesa | Receita | Transferência)  ──► Manda na estrutura macro do formulário
   │
   ├──► 2. DATAS (launchDate e dueDate)                      ──► Mandam na sugestão de Fatura e se é Passado/Futuro
   │
   ├──► 3. CATEGORIA (selectedCategoryId)                    ──► Manda nas Subcategorias disponíveis
   │
   ├──► 4. RECORRÊNCIA (expenseType: Única | Fixa | Parcelada)──► Manda nos campos de parcelamento e geração em lote
   │
   └──► 5. FORMA DE PAGAMENTO (paymentMethod: Conta | Cartão)──► Manda no cálculo de vencimento real (effectiveDueDate)
           │                                                     e decide se o Passo 5 (Situação) existe ou não
           └──► 6. CARTÃO + FATURA (selectedCreditCardId)    ──► Manda na lista de faturas, alerta de fatura fechada
                                                                 e sobrescreve a data de vencimento
```

---

## 2. Mapa de Causalidade ("O que faz aparecer o quê")

### 2.1. O que define quais Passos existem no Wizard (`getSteps()`)

| Condição / Gatilho | Passos Ativos | O que acontece com o Passo 5 (Situação)? |
| :--- | :--- | :--- |
| **Aba = Despesa** + **Pagamento = Conta** + `effectiveDueDate <= hoje` | `1 → 2 → 3 → 4 → 5 → 6` (6 passos) | **Aparece** (pergunta se já foi paga). |
| **Aba = Despesa** + **Pagamento = Conta** + `effectiveDueDate > hoje` | `1 → 2 → 3 → 4 → 6` (5 passos) | **Some** (despesa futura entra direto como `pending`). |
| **Aba = Despesa** + **Pagamento = Cartão de Crédito** | `1 → 2 → 3 → 4 → 6` (5 passos) | **Some sempre** (compra no cartão entra na fatura como `pending`). |
| **Aba = Receita** + `effectiveDueDate <= hoje` | `1 → 2 → 3 → 4 → 5 → 6` (6 passos) | **Aparece** (pergunta se já foi recebida). |
| **Aba = Receita** + `effectiveDueDate > hoje` | `1 → 2 → 3 → 4 → 6` (5 passos) | **Some** (receita futura entra direto como `pending`). |
| **Aba = Transferência** (qualquer data) | `1 → 2 → 3 → 4 → 6` (5 passos) | **Nunca aparece** (status é definido automaticamente se `dueDate <= hoje`). |

---

### 2.2. Gatilhos de Interface e Efeitos Automáticos

| O que o usuário faz (Gatilho) | O que aparece / muda na tela (Efeito) |
| :--- | :--- |
| **Abre o Modal (`open = true`)** | Dispara `getTransactionFormData()` (se ainda não carregado), exibe spinner `"Carregando formulário..."` e carrega Contas, Cartões e Categorias/Subcategorias. |
| **Está no Passo 1** | O seletor de abas (`Despesa`, `Receita`, `Transferência`) fica **editável**. |
| **Avança para o Passo 2 em diante (`step > 1`)** | O seletor de abas **trava** (exibe ícone de cadeado `Lock`, fica desabilitado e mostra apenas a aba escolhida). |
| **Troca a Aba no Passo 1 (`handleTabChange`)** | Reseta Categoria, Subcategoria, Forma de Pagamento (volta para `"account"`), Conta, Cartão e Fatura. Recalcula `isPaid` com base em `dueDate <= hoje`. |
| **Altera a Data de Lançamento (`launchDate`)** | 1. Se a Data de Vencimento **ainda não foi editada manualmente** (`!isDueDateManuallyEdited`), copia o valor para `dueDate` e atualiza `isPaid = (val <= hoje)`.<br>2. Se houver um Cartão selecionado, recalcula automaticamente a Fatura padrão (`selectedInvoiceMonth`). |
| **Altera a Data de Vencimento (`dueDate`)** | Marca `isDueDateManuallyEdited = true` (desvincula da Data de Lançamento) e atualiza `isPaid = (val <= hoje)`. |
| **Seleciona uma Categoria (`handleCategoryChange`)** | 1. Habilita o `Select` de Subcategoria.<br>2. Filtra as subcategorias daquela categoria.<br>3. **Seleciona automaticamente a primeira subcategoria** da lista (`subcats[0].id`). |
| **Clica no botão `+` ao lado de Categoria** | Abre o modal `QuickCategoryDialog` no modo **Nova Categoria** (permite criar categoria + subcategoria opcional + escolher ícone). |
| **Clica no botão `+` ao lado de Subcategoria** | Abre o modal `QuickCategoryDialog` no modo **Nova Subcategoria**, já travado na categoria pai selecionada. |
| **Escolhe Recorrência = `Parcelada` (`installment`)** | Faz aparecer a seção de parcelamento com 3 controles:<br>• Input `Parcela Atual/Inicial` (padrão `1`)<br>• Input `Total de Parcelas` (padrão `2`)<br>• Switch `"O valor é o total da compra?"` (`isTotalAmount`, padrão `true`). |
| **Escolhe Recorrência = `Única` ou `Fixa`** | Esconde imediatamente os campos de parcelamento. |
| **Na Despesa, escolhe Forma de Pagamento = `Conta`** | Faz aparecer o `Select` **"Selecione a Conta"** e esconde os controles de Cartão/Fatura. |
| **Na Despesa, escolhe Forma de Pagamento = `Crédito`** | 1. Esconde o `Select` de Conta.<br>2. Faz aparecer o `Select` **"Cartão de Crédito"**.<br>3. Sobrescreve a data de vencimento efetiva (`effectiveDueDate`) pela data de vencimento da fatura do cartão.<br>4. Remove o Passo 5 do fluxo. |
| **Seleciona um Cartão de Crédito** | 1. Exibe no canto superior direito o texto `"Limite Disp.: R$ X.XXX,XX"`.<br>2. Faz aparecer a grade de **Faturas** (4 cards selecionáveis: mês base e próximos 3) e o texto `"Fecha dia X"`.<br>3. Seleciona automaticamente a fatura padrão com base no `closingDay` do cartão e no `launchDate`. |
| **Tenta avançar do Passo 4 com Fatura já fechada** (`hoje >= data de fechamento da fatura`) | Bloqueia o avanço imediato e abre o `AlertDialog` **"Fatura já fechada"** pedindo confirmação (`Cancelar` ou `Continuar`). |

---

## 3. Passo a Passo Detalhado do Modal

### Cabeçalho Global (Presente em todos os passos)
- **Texto de Progresso:** Exibe `Passo X de Y • [Nome do Passo]`, onde `Y` varia dinamicamente entre `5` e `6`.
- **Barra de Progresso:** Barra horizontal preenchida proporcionalmente a `((currentIndex + 1) / stepsList.length) * 100%`.
- **Seletor de Tipo (Segmented Control):**
  - **Despesa** (indicador ponto vermelho `bg-rose-500`)
  - **Receita** (indicador ponto verde `bg-emerald-500`)
  - **Transferência** (indicador ponto azul `bg-blue-500`)
  - *Nota:* Só pode ser clicado no **Passo 1**. Nos demais passos fica bloqueado com ícone de cadeado.

---

### Passo 1: Identificação (`step === 1`)
**Pergunta na tela:** *"Como deseja chamar?"*

- **Opções / Campos:**
  1. **Seletor de Aba (`Despesa` | `Receita` | `Transferência`):** Define o tipo principal da operação.
  2. **Input `Descrição` (`description`):** Campo de texto com foco automático (`autoFocus`), placeholder `"Ex: Mercado, Salário..."`.
- **Atalho:** Pressionar `Enter` chama `handleNextStep()`.
- **Validação para avançar:**
  - `description.trim()` não pode estar vazio → Caso contrário, exibe toast de erro: `"Preencha a descrição"`.

---

### Passo 2: Valor e Datas (`step === 2`)
**Pergunta na tela:** *"Qual o valor e as datas?"*

- **Opções / Campos:**
  1. **Input `Valor` (`CurrencyInput` -> `amount`):** Campo monetário formatado em BRL com `autoFocus`. Aceita `Enter` para avançar.
  2. **DatePicker `Data de Lançamento` (`launchDate`):** Quando o fato gerador/compra ocorreu (padrão: data de hoje).
  3. **DatePicker `Data de Vencimento` (`dueDate`):** Quando o pagamento/recebimento vence (padrão: acompanha `launchDate` até que o usuário edite `dueDate` manualmente).
- **O que este passo controla:**
  - Sincroniza `dueDate` com `launchDate` enquanto `isDueDateManuallyEdited` for `false`.
  - Define o estado inicial de `isPaid` (`true` se a data for hoje ou passada, `false` se for futura).
- **Validação para avançar:**
  - `amount`, `launchDate` e `effectiveDueDate` devem estar preenchidos → Caso contrário, exibe toast: `"Preencha o valor e as datas"`.

---

### Passo 3: Categoria OU Contas da Transferência (`step === 3`)

Este passo muda **completamente** dependendo da aba escolhida no Passo 1:

#### Cenário A: Aba = `Despesa` ou `Receita`
**Pergunta na tela:** *"Como deseja categorizar?"*

- **Opções / Campos:**
  1. **Select `Categoria` (`selectedCategoryId`):**
     - Filtra apenas categorias cujo `type` corresponde à aba (`expense` para Despesa, `income` para Receita).
     - Ao selecionar, preenche automaticamente a primeira subcategoria disponível.
  2. **Botão `+` (Nova Categoria - `QuickCategoryDialog`):**
     - Abre um sub-modal (`z-[200]`) para criar rapidamente uma categoria sem sair da transação.
     - Permite definir **Nome da Categoria**, **Subcategoria (Opcional)** (se em branco, usa `"Geral"`) e **Ícone**.
     - Ao criar, recarrega os dados do formulário e já seleciona a nova categoria e subcategoria automaticamente.
  3. **Select `Subcategoria` (`selectedSubcategoryId`):**
     - Fica **desabilitado (`disabled`)** até que uma Categoria seja escolhida.
     - Lista as subcategorias pertencentes à categoria selecionada.
  4. **Botão `+` (Nova Subcategoria - `QuickCategoryDialog` com `isSubcategoryMode=true`):**
     - Cria uma subcategoria diretamente dentro da categoria selecionada e já a seleciona.
- **Validação para avançar:**
  - `selectedCategoryId` é obrigatório → Caso contrário, exibe toast: `"Selecione uma categoria"`.
  - *(Nota: No backend, `subcategoryId` também é validado como obrigatório para receitas e despesas).*

#### Cenário B: Aba = `Transferência`
**Pergunta na tela:** *"De onde para onde?"*

- **Opções / Campos:**
  1. **Select `Conta de Origem (Sai dinheiro)` (`accountIdTransferOrigin`):** Lista todas as contas cadastradas.
  2. **Select `Conta de Destino (Entra dinheiro)` (`accountIdTransferDest`):** Lista todas as contas cadastradas.
- **Validações para avançar:**
  - Ambas as contas devem ser selecionadas → Toast: `"Selecione as contas"`.
  - Origem e destino não podem ser iguais (`accountIdTransferOrigin === accountIdTransferDest`) → Toast: `"Contas de origem e destino devem ser diferentes"`.

---

### Passo 4: Configuração (`step === 4`)
**Pergunta na tela:** *"Como isso vai funcionar?"*

Divide-se em duas partes: **Recorrência** (comum a todas as abas) e **Destino/Forma de Pagamento** (varia por aba).

#### Parte 4.1: Recorrência (`expenseType` — aparece em Despesa, Receita e Transferência)
Três cards selecionáveis (`SelectableCard`):
1. **Única (`single`):** *"Sem repetições"* (Padrão). Cria apenas 1 lançamento.
2. **Fixa (`fixed`):** *"Mensal"*. Registra um template em `fixed_transactions` e materializa 12 meses no banco.
3. **Parcelada (`installment`):** *"Dividir valor"*. Ao selecionar, **faz aparecer**:
   - **Input `Parcela Atual/Inicial` (`currentInstallment`):** Padrão `"1"`. Indica a partir de qual parcela o lançamento começa (só gera parcelas de `currentInstallment` até `installmentTotal`).
   - **Input `Total de Parcelas` (`installmentTotal`):** Padrão `"2"` (mínimo 2).
   - **Switch `"O valor é o total da compra?"` (`isTotalAmount`):**
     - **Ativo (`true` - padrão):** Divide o `amount` informado no Passo 2 pelo número total de parcelas (ajustando centavos residuais na última parcela).
     - **Inativo (`false`):** Usa o `amount` informado no Passo 2 como o valor cheio de **cada** parcela.

#### Parte 4.2: Forma de Pagamento / Conta (Depende da Aba)

- **Se Aba = `Despesa`:**
  Exibe o seletor **Forma de Pagamento** com 2 cards:
  1. **Card `Conta` (`paymentMethod === "account"`):** *"Saldo à vista"*
     - Faz aparecer o **Select `Selecione a Conta` (`accountId`)**.
     - Mantém a `dueDate` escolhida no Passo 2 como data de vencimento efetiva.
  2. **Card `Crédito` (`paymentMethod === "credit_card"`):** *"Fatura"*
     - Faz aparecer o **Select `Cartão de Crédito` (`selectedCreditCardId`)**, mostrando o nome do cartão e `"Vence dia X"`.
     - Ao escolher um cartão:
       - Mostra no topo direito: `"Limite Disp.: R$ X.XXX,XX"`.
       - Calcula a fatura sugerida: se o dia de `launchDate >= card.closingDay`, joga para o mês seguinte; caso contrário, mantém no mês de `launchDate`.
       - Faz aparecer a seção **Fatura** com `"Fecha dia X"` e 4 cards selecionáveis correspondentes ao mês sugerido e aos 3 meses subsequentes (`invoiceOptions.slice(3, 7)`).
       - Atualiza `calculatedCardDueDate` para o dia de vencimento (`dueDay`) do mês da fatura escolhida.

- **Se Aba = `Receita`:**
  - Exibe diretamente o **Select `Depositar na Conta` (`accountIdIncome`)**.

- **Se Aba = `Transferência`:**
  - Não exibe seletor de conta neste passo (pois Origem e Destino já foram escolhidos no Passo 3).

- **Validações para avançar do Passo 4:**
  - Se `expenseType === "installment"` e faltar `currentInstallment` ou `installmentTotal` → Toast: `"Preencha as parcelas"`.
  - Se `Despesa` + `Conta` e sem `accountId` → Toast: `"Selecione uma conta"`.
  - Se `Despesa` + `Crédito` e sem cartão ou fatura → Toast: `"Selecione o cartão e a fatura"`.
  - **Validação Especial de Fatura Fechada:** Se `Despesa` + `Crédito` e a data de hoje for maior ou igual à data de fechamento da fatura selecionada (`today >= new Date(year, month - 1, card.closingDay)`), abre o **AlertDialog `"Fatura já fechada"`**. O usuário só avança se clicar em **"Continuar"**.
  - Se `Receita` e sem `accountIdIncome` → Toast: `"Selecione a conta"`.

---

### Passo 5: Situação (`step === 5` — Condicional)
**Pergunta na tela:** *"Qual a situação atual?"*

> **Quando este passo aparece?**  
> Somente quando:
> - (`tab === "expense"` **E** `paymentMethod === "account"` **E** `effectiveDueDate <= hoje`) **OU**
> - (`tab === "income"` **E** `effectiveDueDate <= hoje`).  
> Em qualquer outro caso, o Wizard pula direto do Passo 4 para o Passo 6.

- **Opções / Campos:**
  - **Switch `isPaid`:**
    - Na **Despesa**: *"Essa despesa já foi paga?"*
      - Ligado (`true`): `"Marcado como Pago. O valor será deduzido do saldo."`
      - Desligado (`false`): `"Marcado como Pendente. Não afetará o saldo atual da conta ainda."`
    - Na **Receita**: *"Essa receita já foi recebida?"*
      - Ligado (`true`): `"Marcado como Recebido. O valor será adicionado ao saldo."`
      - Desligado (`false`): `"Marcado como Pendente. Não afetará o saldo atual da conta ainda."`

---

### Passo 6: Resumo e Finalização (`step === 6`)
Exibe o card de conferência (`renderSummary()`) com todos os dados consolidados:

- **Itens exibidos no Resumo:**
  - **Tipo no subtítulo:** `DESPESA`, `RECEITA` ou `TRANSFERÊNCIA`.
  - **Valor:** `R$ XX,XX`.
  - **Lançamento:** `dd/MM/yyyy`.
  - **Vencimento:** `dd/MM/yyyy` (adiciona o sufixo `(Fatura)` se for cartão de crédito).
  - **Descrição:** Texto informado no Passo 1.
  - **Categoria:** `Categoria - Subcategoria` *(oculto se for Transferência)*.
  - **Tipo (Recorrência):** `Única`, `Fixa` ou `Parcelada (X/Y)`.
  - **Pagamento / Conta / Origem-Destino:**
    - Se Despesa em Conta: Nome da conta.
    - Se Despesa no Cartão: `Cartão: [Nome] (YYYY-MM)`.
    - Se Receita: Nome da conta de depósito.
    - Se Transferência: Linhas separadas para `Origem` e `Destino`.
  - **Situação:** `Pago`/`Recebido` (verde) ou `Pendente` (laranja) *(exibido apenas se o Passo 5 fez parte do fluxo)*.

- **Botões de Ação no Rodapé do Passo 6:**
  1. **`Voltar`:** Retorna ao passo anterior (`Passo 5` ou `Passo 4`).
  2. **`+ Adicionar Outra` (`handleSubmit("save-and-continue")`):**
     - Salva a transação no banco.
     - **Mantém o modal aberto**, reseta todos os campos para o estado inicial, volta para o **Passo 1**, mas **preserva a aba atual (`tab`)** para facilitar lançamentos seguidos do mesmo tipo.
  3. **`✓ Finalizar` (`handleSubmit("save-and-close")`):**
     - Salva a transação no banco.
     - **Fecha o modal** e reseta todo o estado.

---

## 4. O que acontece ao Salvar (Regras de Negócio e Banco de Dados)

Ao clicar em **Finalizar** ou **Adicionar Outra**, o componente monta o payload e chama a Server Action `createTransaction`:

### 4.1. Definição do `status` e `type` enviados pelo Modal
- **`status`:** Será `"paid"` **somente se** `isPaid === true` **E** `effectiveDueDate <= hoje`. Caso contrário, é sempre `"pending"`.
  - *Atenção para Cartão de Crédito:* Mesmo que a compra seja hoje, no backend compras de cartão não abatem saldo de conta bancária na criação (ficam vinculadas à fatura do cartão).
- **`type`:**
  - Aba `expense` + `account` → `"expense"`
  - Aba `expense` + `credit_card` → `"credit_card_expense"`
  - Aba `income` → `"income"`
  - Aba `transfer` → `"transfer"`

### 4.2. Cálculo da Competência (`competencyMonth`)
- **Cartão de Crédito (`credit_card_expense`):** A competência (`competencyMonth`) e o `invoiceMonth` assumem o mês da fatura selecionada (`YYYY-MM`).
- **Conta (`expense`, `income`, `transfer`):** No backend (`createTransaction`), a competência é calculada comparando o dia de `dueDate` com o `closingDay` global do usuário na tabela `settings` (padrão dia 25):
  - Se `dia > closingDay` → Competência é o **mês seguinte** (`addMonths(dueDate, 1)`).
  - Se `dia <= closingDay` → Competência é o **próprio mês** do vencimento.

### 4.3. Efeitos no Banco por Tipo de Recorrência

| Recorrência | O que é gravado no Banco de Dados | Impacto no Saldo (`current_balance`) |
| :--- | :--- | :--- |
| **Única (`single`)** | • **Despesa/Receita:** Insere 1 registro em `transactions`.<br>• **Transferência:** Insere 2 registros em `transactions`: um de `(Saída)` na conta de origem e outro de `(Entrada)` na conta de destino vinculado via `parentTransactionId`. | Se `status === "paid"`, atualiza imediatamente o saldo da(s) conta(s). |
| **Fixa (`fixed`)** | 1. Cria 1 registro mestre na tabela `fixed_transactions` (`active: true`).<br>2. Gera imediatamente **12 lançamentos mensais consecutivos** na tabela `transactions` vinculados por `fixedTransactionId` (se for transferência, gera 24 registros: 12 saídas + 12 entradas). | Apenas o **1º lançamento (`i === 0`)** respeita o `status` escolhido (`paid` ou `pending`) e altera o saldo atual. Os outros 11 meses futuros são criados sempre como `"pending"`. |
| **Parcelada (`installment`)** | 1. Calcula o valor da parcela (dividindo o total se `isTotalAmount = true` e jogando a diferença de arredondamento para a última parcela, ou mantendo o valor cheio se `isTotalAmount = false`).<br>2. Gera lançamentos mensais da parcela `currentInstallment` até `installmentTotal` com sufixo `(X/Y)` na descrição.<br>3. A primeira parcela inserida é a transação-mãe; as demais recebem `installmentParentId = originParentId`. | Apenas a **primeira parcela gerada** (`currentInstallment`) recebe o `status` do formulário (`paid` ou `pending`) e afeta o saldo. Todas as parcelas seguintes (`currentInstallment + 1` até `installmentTotal`) entram como `"pending"`. |

