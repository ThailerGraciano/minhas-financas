# Sistema de Temas e Cores Unificado

O **Minhas Finanças AI** possui um sistema unificado de temas que permite alterar a paleta de cores de **todo o sistema** (Sidebar, Dashboard, Modais, Cards, Botões, Badges e Gráficos) em **apenas uma linha de código**.

---

## 🚀 Como Trocar o Tema em 1 Linha

Abra o arquivo [`src/components/transaction-theme.ts`](file:///home/thailergraciano/Pessoal/minhas-financas/src/components/transaction-theme.ts) e altere a constante `ACTIVE_THEME_ID`:

```typescript
// Opções disponíveis: "obsidian_ultraviolet" | "midnight_electric" | "carbon_gold" | "emerald_banking" | "midnight_orange"
export const ACTIVE_THEME_ID: ThemeId = "obsidian_ultraviolet";
```

Pronto! Ao alterar esse valor:
1. O atributo `data-theme` na tag `<html data-theme="...">` do `src/app/layout.tsx` é atualizado.
2. Todas as variáveis de cores do Tailwind CSS v4 (`--primary`, `--background`, `--card`, `--border`, etc.) mudam simultaneamente.
3. O Modal de Nova Transação adota os fundos e acentos correspondentes.
4. O Dashboard, a Sidebar, gráficos e botões passam a usar a nova paleta.

---

## 🎨 Presets Disponíveis

| Preset | ID | Inspiração | Cor Primária | Fundo Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Obsidian Ultraviolet** *(Ativo)* | `obsidian_ultraviolet` | Nubank Ultravioleta + Apple Liquid Glass | Roxo Ultravioleta (`#820AD1`) | Preto Absoluto (`#000000`) |
| **Midnight + Electric Blue** | `midnight_electric` | Apple Liquid Glass / C6 Tech | Azul Cobalto (`#639BFF`) | Midnight (`#0B1220`) |
| **Carbon & Gold** | `carbon_gold` | C6 Bank Black Carbon | Dourado (`#FBBF24`) | Grafite Preto (`#0A0A0C`) |
| **Emerald Banking** | `emerald_banking` | Private Banking & Wealth | Esmeralda (`#10B981`) | Esmeralda Profundo (`#061311`) |
| **Midnight Orange** | `midnight_orange` | Visual Clássico Minhas Finanças | Laranja Neon (`#F97316`) | Chumbo Escuro (`#0B101B`) |

---

## 🏗️ Arquitetura do Sistema de Cores

O ecossistema foi projetado para eliminar valores de cores fixos (hardcoded) e manter uma **única fonte de verdade**:

```
src/components/transaction-theme.ts (ACTIVE_THEME_ID)
                         │
                         ▼
             src/app/layout.tsx (<html data-theme={ACTIVE_THEME.id}>)
                         │
                         ▼
             src/app/globals.css ([data-theme="..."])
   ┌─────────────────────┴─────────────────────┐
   ▼                                           ▼
Tokens Globais (Tailwind & shadcn)       Semânticas de Transação
--background, --card, --border,          --color-expense, --color-income,
--primary, --muted-foreground...         --color-transfer...
   │                                           │
   ▼                                           ▼
Interface Geral (Sidebar, Cards, Nav)    Modal de Transação & Gráficos
```

### 1. `src/components/transaction-theme.ts`
Contém a definição dos presets em TypeScript com tipagem estrita (`ThemePreset`, `ThemeId`, `MidnightBaseTokens`, `AccentColorConfig`).

### 2. `src/app/globals.css`
Declara as variáveis CSS para cada seletor `[data-theme="..."]`. Além disso, mapeia via `@theme inline` as classes de utilidade do Tailwind v4:
- `bg-background`, `bg-card`, `bg-card-elevated`, `bg-popover`
- `text-primary`, `bg-primary`, `border-primary`
- `text-expense`, `bg-expense-soft`, `text-income`, `bg-income-soft`

### 3. Componentes do Modal & Efeito Apple Liquid Glass
Consomem diretamente os tokens semânticos e acabamentos de vidro:
- `SelectableCard`: Efeito Apple Liquid Glass nos cartões de seleção (Conta vs Crédito, Recorrência Única, Fixa e Parcelada):
  - Fundo translúcido com `backdrop-blur-xl saturate(180%)`.
  - Linha especular superior (`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent`) simulando reflexo de chanfro de vidro.
  - Sombra interna dupla com brilho especular (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.28)`).
  - Luz difusa líquida colorida (`glow` suave) quando selecionado.
- `FormHeader`: Segmented control com cápsula líquida fosca (`backdrop-blur-xl`) e botão ativo com relevo de vidro.
- `GlassCard`: Fundo adaptativo com `bg-[var(--card-elevated)]/75` ou `bg-card/70` e efeito glassmorphism com blur.
- `FormFooter`: Barra de ações adaptada à superfície do tema ativo.

### 4. Arquitetura Liquid Glass em 2 Níveis para Telas e Listagens
Para conciliar o visual fluido cinematográfico com legibilidade máxima de números financeiros:
1. **Tier 1 (Heróis, Containers, Modais e Widgets Globais):**
   - Translucidez de 65% a 70% (`bg-card/70 backdrop-blur-xl border border-white/[0.08]`).
   - Sombra com chanfro de luz superior (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)]`).
   - Linha de brilho especular no topo (`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent`).
   - Presente em: Dashboard Widgets, Cards de Resumo em `/transactions`, Saldo Consolidado em `/accounts`, Resumo de Faturas em `/credit-cards`, Orçamentos em `/budgets`, Gráficos e Overlays/Modais (`Dialog`, `Sheet`, `Select`, `DropdownMenu`).
2. **Tier 2 (Itens de Listagens e Linhas Densas):**
   - Maior opacidade (85% a 95%) para contraste e nitidez absoluta dos números (`bg-card/85 backdrop-blur-md border border-white/[0.07] hover:bg-card/95`).
   - Sombra sutil de profundidade (`shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.35)]`).
   - Presente em: Linhas de transação em `/transactions`, cartões de conta na lista de `/accounts`, cartões de cartão em `/credit-cards`, linhas de categoria em `/budgets`, lançamentos futuros em `/planning`, sanfonas de categoria em `/categories` e contratos de empréstimo em `/loans`.

---

## 🛠️ Como Adicionar um Novo Tema

Para criar um novo tema personalizado:

1. **Adicione o preset no `transaction-theme.ts`:**
   ```typescript
   export const THEME_PRESETS: Record<string, ThemePreset> = {
     // ... outros presets
     meu_novo_tema: {
       id: "meu_novo_tema",
       name: "Meu Novo Tema",
       description: "Descrição do tema",
       midnight: { ... },
       accents: { expense: { ... }, income: { ... }, transfer: { ... } },
     },
   };
   ```
2. **Adicione as variáveis CSS no `src/app/globals.css`:**
   ```css
   [data-theme="meu_novo_tema"] {
     --background: #...;
     --card: #...;
     --primary: #...;
     /* demais variáveis */
   }
   ```
3. **Selecione o tema:**
   ```typescript
   export const ACTIVE_THEME_ID: ThemeId = "meu_novo_tema";
   ```
