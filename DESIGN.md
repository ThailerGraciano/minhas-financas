# Design System & UI Guidelines - Minhas Finanças AI (Budget Buddy)

Este documento descreve as diretrizes de interface do usuário (UI), paleta de cores, tipografia e estrutura de componentes baseados nos protótipos de alta fidelidade do sistema. O objetivo é guiar o desenvolvimento visual com Next.js, Tailwind CSS e os componentes do shadcn/ui.

## 1. Visão Geral (Conceito Visual)

O aplicativo adota uma estética **Premium Dark Mode** como padrão nativo. A interface transmite controle, sofisticação e clareza financeira.

- **Foco:** Dados em primeiro lugar. A interface utiliza tons de cinza super escuro (quase preto) para permitir que os números, os gráficos e os status de feedback (verde, vermelho e laranja) saltem aos olhos.
- **Formas:** Bordas arredondadas suaves (`rounded-xl`, `rounded-2xl`) aplicadas de forma consistente em cartões, botões e modais, criando uma interface amigável porém muito profissional.
- **Profundidade:** Uso mínimo de sombras clássicas (box-shadow). A profundidade e separação de elementos são criadas através de painéis com diferentes "camadas" de fundos e bordas incrivelmente sutis.

---

## 2. Paleta de Cores

A paleta foi idealizada para contraste máximo no modo escuro. O Laranja vibrante atua como cor da marca e principal gatilho de ação, enquanto Verde e Vermelho mantêm suas fortes semânticas financeiras.

### Fundos (Surfaces)

- **Background Principal:** `#0F0F13` ou `#121217` (Cinza chumbo profundo/quase preto). Usado no fundo do corpo geral da tela e sidebar.
- **Card / Surface:** `#1A1A22` (Cinza levemente mais claro). Usado para criar os painéis de cartões, modais e resumos no dashboard.
- **Hover / Active:** `#23232D`. Utilizado para feedback visual de seleções e _hover_ em linhas de tabelas.

### Cores de Destaque (Accents & Brand)

- **Primária (Laranja/Cobre):** `#FF6B00` ou `#F97316` (Equivalente ao Tailwind `orange-500`). Usado no logotipo, botões principais (ex: "Nova Transação", "New Account"), barras de progresso ativas e traçados principais de gráficos de linha.
- **Sucesso / Receita (Verde):** `#10B981` (Tailwind `emerald-500`). Usado para valores de receita, saldos crescentes e gráficos indicativos positivos.
- **Alerta / Despesa (Vermelho):** `#EF4444` (Tailwind `red-500`). Usado para marcações de despesas, valores negativos e botões de exclusão.

### Textos (Typography)

- **Texto Principal:** `#F8FAFC` (Branco gelo). Usado para valores financeiros de grande destaque e cabeçalhos de tela.
- **Texto Secundário:** `#94A3B8` (Cinza claro mutado / `text-muted-foreground`). Fundamental para legendas, cabeçalhos de tabela e descrições sem que briguem pela atenção do usuário.

---

## 3. Tipografia

O sistema exige uma fonte limpa, geométrica e sem serifa (Sans-Serif), com excelente legibilidade e, crucialmente, suporte a números tabulares (Tabular Nums) para alinhar valores financeiros.

- **Fontes Sugeridas:** _Inter_, _Roboto_ ou _Geist Sans_.
- **Hierarquia:**
  - `h1` (Saldos Consolidados): `text-3xl` ou `text-4xl`, `font-bold`.
  - `h2` (Títulos de Seções / Nomes de Cartões): `text-lg` ou `text-xl`, `font-semibold`.
  - `body` (Textos gerais e listas): `text-sm`, `font-normal`, usando a cor mutada.
  - `caption` (Tags, datas menores): `text-xs`, `font-medium`.

---

## 4. Estrutura de Layout

- **Navegação (Desktop):** Sidebar muito limpa com fundo idêntico ao _background_ principal. Ícones em cinza quando inativos; quando ativos, ganham um _background_ cinza (surface) e um filete vertical laranja na lateral esquerda para indicar a página atual.
- **Paddings & Gaps:** Uso de respiro generoso, variando entre `gap-4`, `gap-6` e `p-4`/`p-6`. Componentes não devem encostar nas bordas de forma espremida.
- **Container Central:** O layout central das páginas (como Dashboard e Mercado) deve utilizar um limite máximo (ex: `max-w-7xl`) para evitar distorção de gráficos em monitores muito longos.

---

## 5. Componentes Base (Customização shadcn/ui)

### Cartões (Cards)

- **Fundo:** Cor de superfície `bg-[#1A1A22]`.
- **Borda:** Quase imperceptível `border border-white/5` apenas para destacá-lo sutilmente contra o fundo negro. Estados ativos (como cartão de crédito selecionado) ganham bordas destacadas `border-orange-500`.
- **Arredondamento:** `rounded-xl`.

### Botões (Buttons)

- **Primário:** Fundo laranja vibrante (`bg-orange-500`), texto em branco, sem bordas.
- **Floating Action Button (FAB):** Botões globais de "Adicionar", no canto da tela ou integrados no meio, adotam um formato _Pill_ (`rounded-full`) em laranja sólido.
- **Filtros e Controles:** Botões em estado de _ghost_ ou _outline_ utilizam fundos quase transparentes com traços de laranja em interação.

### Tags e Badges

- Utilizam a cor principal do status (verde/vermelho/laranja) com forte transparência no fundo (ex: `bg-green-500/10`) e cor viva no texto (`text-green-500`) para excelente legibilidade, como notado nas tags percentuais da tela de Planejamento.

---

## 6. Visualização de Dados (Gráficos)

As visualizações de dados foram feitas para evocar tecnologia financeira de ponta:

- **Gráficos de Evolução (Linha / Área):** Uso de linhas curvosas suaves (`monotone`). A área preenchida logo abaixo da linha possui um forte gradiente que desaparece até a base (ex: Verde brilhante no topo → transparente no eixo X).
- **Gráficos Empilhados (Projeções):** Utilizam camadas análogas da marca, como escalas de Laranja/Ferrugem que vão escurecendo.
- **SpaceSniffer / Treemap:** Blocos organizados hierarquicamente preenchidos com cores variadas e sólidas (mas em tons ligeiramente dessaturados: laranjas queimados, verdes profundos) e textos em branco.
- **Grids e Eixos:** Sem linhas de grades complexas. Grids no eixo Y, quando necessários, devem ser extremamente finos (`rgba(255, 255, 255, 0.05)`).

---

## 7. Referência de Configuração no Tailwind CSS (`globals.css`)

Para replicar com exatidão esse protótipo usando o `shadcn/ui`, injete e adapte as variáveis abaixo no seu `globals.css` dentro do bloco `@layer base`:

```css
@layer base {
  :root,
  .dark {
    /* Superfícies */
    --background: 240 10% 6%; /* #0e0e11 */
    --foreground: 0 0% 98%; /* #FAFAFA */

    --card: 240 8% 11%; /* #19191d */
    --card-foreground: 0 0% 98%;

    --popover: 240 8% 11%;
    --popover-foreground: 0 0% 98%;

    /* Brand Accent */
    --primary: 24 100% 50%; /* #FF6600 (Laranja vibrante) */
    --primary-foreground: 0 0% 100%;

    --secondary: 240 5% 15%; /* #242429 */
    --secondary-foreground: 0 0% 98%;

    --muted: 240 5% 15%;
    --muted-foreground: 240 5% 65%; /* #A1A1AA */

    --accent: 240 5% 15%;
    --accent-foreground: 0 0% 98%;

    /* Feedback Semântico */
    --destructive: 0 84% 60%; /* #EF4444 (Vermelho Alerta) */
    --destructive-foreground: 0 0% 98%;

    --success: 142 71% 45%; /* #10B981 (Verde Receita) */
    --success-foreground: 0 0% 98%;

    /* Controles */
    --border: 240 5% 15%; /* Bordas muito sutis */
    --input: 240 5% 10%; /* Fundo de input escurecido */
    --ring: 24 100% 50%; /* O anel de foco herda o laranja */

    /* Arredondamento */
    --radius: 1rem; /* equivalent a rounded-xl / 2xl */
  }
}
```
