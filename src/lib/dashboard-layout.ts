export type DashboardWidgetId =
  | "health-summary"
  | "balance-summary"
  | "emergency-reserve"
  | "monthly-totals"
  | "accounts-carousel"
  | "balance-evolution"
  | "expense-composition"
  | "expenses-forecast"
  | "expense-treemap"
  | "income-treemap"
  | "open-invoices"
  | "installments-projection"
  | "goals-stash"
  | "category-forecast"
  | "advanced-analytics";

export type AdvancedChartId =
  | "global-income-expense"
  | "account-income-expense"
  | "purchasing-power"
  | "account-vs-global";

export type WidgetColSpan = 2 | 3 | 4 | 6;

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  title: string;
  description: string;
  defaultColSpan: WidgetColSpan;
}

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  colSpan: WidgetColSpan;
  visible: boolean;
}

export interface DashboardLayoutState {
  version: 1;
  widgets: DashboardWidgetConfig[];
  advancedChartsOrder: AdvancedChartId[];
  advancedAnalyticsOpen: boolean;
}

export const DASHBOARD_LAYOUT_STORAGE_KEY = "minhas-financas:dashboard-layout:v1";

export const DASHBOARD_WIDGETS_META: readonly DashboardWidgetMeta[] = [
  {
    id: "health-summary",
    title: "Saúde do Mês",
    description: "Resumo de comprometimento de renda e margem mensal",
    defaultColSpan: 2,
  },
  {
    id: "balance-summary",
    title: "Saldo Total",
    description: "Saldo consolidado de todas as contas e atalhos rápidos",
    defaultColSpan: 2,
  },
  {
    id: "emergency-reserve",
    title: "Reserva de Emergência",
    description: "Acompanhamento da reserva financeira e meses de cobertura",
    defaultColSpan: 2,
  },
  {
    id: "monthly-totals",
    title: "Receitas e Despesas do Mês",
    description: "Totalizadores rápidos de entradas e saídas da competência",
    defaultColSpan: 6,
  },
  {
    id: "accounts-carousel",
    title: "Minhas Contas & Caixas",
    description: "Carrossel com saldo atual das contas operacionais",
    defaultColSpan: 6,
  },
  {
    id: "balance-evolution",
    title: "Evolução de Saldo",
    description: "Histórico dos últimos 6 meses e projeção para os próximos 6",
    defaultColSpan: 6,
  },
  {
    id: "expense-composition",
    title: "Composição de Despesas",
    description: "Comparativo entre despesas fixas, variáveis e parceladas",
    defaultColSpan: 6,
  },
  {
    id: "expenses-forecast",
    title: "Previsão de Gastos",
    description: "Projeção de despesas para os próximos 6 meses",
    defaultColSpan: 6,
  },
  {
    id: "expense-treemap",
    title: "Mapeamento de Despesas",
    description: "Distribuição proporcional de gastos por categoria no mês",
    defaultColSpan: 6,
  },
  {
    id: "income-treemap",
    title: "Mapeamento de Receitas",
    description: "Distribuição proporcional de receitas por categoria no mês",
    defaultColSpan: 6,
  },
  {
    id: "open-invoices",
    title: "Faturas Abertas",
    description: "Gastos e limites dos cartões de crédito neste mês",
    defaultColSpan: 6,
  },
  {
    id: "installments-projection",
    title: "Projeção de Parcelamentos",
    description: "Acúmulo de faturas com compras parceladas e alívio futuro",
    defaultColSpan: 6,
  },
  {
    id: "goals-stash",
    title: "Minhas Caixinhas",
    description: "Metas, aportes e evolução dos seus objetivos",
    defaultColSpan: 6,
  },
  {
    id: "category-forecast",
    title: "Previsão por Categoria",
    description: "Projeção de despesas categorizadas para os próximos 6 meses",
    defaultColSpan: 6,
  },
  {
    id: "advanced-analytics",
    title: "Análises Avançadas",
    description: "Comparativos por conta, poder de compra e despesa global",
    defaultColSpan: 6,
  },
] as const;

export const DEFAULT_ADVANCED_CHARTS_ORDER: readonly AdvancedChartId[] = [
  "global-income-expense",
  "account-income-expense",
  "purchasing-power",
  "account-vs-global",
] as const;

export const ADVANCED_CHARTS_META: Record<AdvancedChartId, { title: string; description: string }> = {
  "global-income-expense": {
    title: "Receita vs Despesa Global",
    description: "Comparativo consolidado do mês",
  },
  "account-income-expense": {
    title: "Receita vs Despesa por Conta",
    description: "Entradas e saídas em cada conta",
  },
  "purchasing-power": {
    title: "Poder de Compra por Conta",
    description: "Capacidade disponível em cada conta",
  },
  "account-vs-global": {
    title: "Despesa da Conta vs Global",
    description: "Participação de cada conta nas saídas totais",
  },
};

export function getDefaultDashboardLayout(): DashboardLayoutState {
  return {
    version: 1,
    widgets: DASHBOARD_WIDGETS_META.map((meta) => ({
      id: meta.id,
      colSpan: meta.defaultColSpan,
      visible: true,
    })),
    advancedChartsOrder: [...DEFAULT_ADVANCED_CHARTS_ORDER],
    advancedAnalyticsOpen: false,
  };
}

const VALID_WIDGET_IDS = new Set<DashboardWidgetId>(DASHBOARD_WIDGETS_META.map((m) => m.id));
const VALID_ADVANCED_IDS = new Set<AdvancedChartId>(DEFAULT_ADVANCED_CHARTS_ORDER);
const VALID_COL_SPANS = new Set<WidgetColSpan>([2, 3, 4, 6]);

function isWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && VALID_WIDGET_IDS.has(value as DashboardWidgetId);
}

function isAdvancedChartId(value: unknown): value is AdvancedChartId {
  return typeof value === "string" && VALID_ADVANCED_IDS.has(value as AdvancedChartId);
}

function isWidgetColSpan(value: unknown): value is WidgetColSpan {
  return typeof value === "number" && VALID_COL_SPANS.has(value as WidgetColSpan);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDashboardLayout(rawJson: string | null): DashboardLayoutState {
  const fallback = getDefaultDashboardLayout();
  if (!rawJson) return fallback;

  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!isRecord(parsed)) return fallback;

    const seenWidgets = new Set<DashboardWidgetId>();
    const widgets: DashboardWidgetConfig[] = [];

    if (Array.isArray(parsed.widgets)) {
      for (const item of parsed.widgets) {
        if (!isRecord(item) || !isWidgetId(item.id) || seenWidgets.has(item.id)) {
          continue;
        }
        const meta = DASHBOARD_WIDGETS_META.find((m) => m.id === item.id);
        const colSpan = isWidgetColSpan(item.colSpan)
          ? item.colSpan
          : (meta?.defaultColSpan ?? 6);
        const visible = typeof item.visible === "boolean" ? item.visible : true;

        seenWidgets.add(item.id);
        widgets.push({ id: item.id, colSpan, visible });
      }
    }

    // Add any missing default widgets (e.g. if new widgets were introduced)
    for (const meta of DASHBOARD_WIDGETS_META) {
      if (!seenWidgets.has(meta.id)) {
        widgets.push({
          id: meta.id,
          colSpan: meta.defaultColSpan,
          visible: true,
        });
      }
    }

    const seenAdvanced = new Set<AdvancedChartId>();
    const advancedChartsOrder: AdvancedChartId[] = [];

    if (Array.isArray(parsed.advancedChartsOrder)) {
      for (const id of parsed.advancedChartsOrder) {
        if (isAdvancedChartId(id) && !seenAdvanced.has(id)) {
          seenAdvanced.add(id);
          advancedChartsOrder.push(id);
        }
      }
    }

    for (const defaultId of DEFAULT_ADVANCED_CHARTS_ORDER) {
      if (!seenAdvanced.has(defaultId)) {
        advancedChartsOrder.push(defaultId);
      }
    }

    const advancedAnalyticsOpen =
      typeof parsed.advancedAnalyticsOpen === "boolean" ? parsed.advancedAnalyticsOpen : false;

    return {
      version: 1,
      widgets,
      advancedChartsOrder,
      advancedAnalyticsOpen,
    };
  } catch {
    return fallback;
  }
}

export function moveArrayItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function reorderWidgetsById(
  widgets: readonly DashboardWidgetConfig[],
  activeId: DashboardWidgetId,
  overId: DashboardWidgetId,
): DashboardWidgetConfig[] {
  const fromIndex = widgets.findIndex((w) => w.id === activeId);
  const toIndex = widgets.findIndex((w) => w.id === overId);
  return moveArrayItem(widgets, fromIndex, toIndex);
}

export function isDefaultDashboardLayout(layout: DashboardLayoutState): boolean {
  const def = getDefaultDashboardLayout();
  if (layout.widgets.length !== def.widgets.length) return false;
  for (let i = 0; i < def.widgets.length; i++) {
    const a = layout.widgets[i];
    const b = def.widgets[i];
    if (a.id !== b.id || a.colSpan !== b.colSpan || a.visible !== b.visible) {
      return false;
    }
  }
  for (let i = 0; i < def.advancedChartsOrder.length; i++) {
    if (layout.advancedChartsOrder[i] !== def.advancedChartsOrder[i]) {
      return false;
    }
  }
  return true;
}

const DEFAULT_LAYOUT_SNAPSHOT: DashboardLayoutState = getDefaultDashboardLayout();
let cachedRawLayout: string | null = null;
let cachedParsedLayout: DashboardLayoutState = DEFAULT_LAYOUT_SNAPSHOT;
const LAYOUT_CHANGE_EVENT = "minhas-financas:dashboard-layout-change";

export function getDashboardLayoutServerSnapshot(): DashboardLayoutState {
  return DEFAULT_LAYOUT_SNAPSHOT;
}

export function getDashboardLayoutClientSnapshot(): DashboardLayoutState {
  if (typeof window === "undefined") {
    return DEFAULT_LAYOUT_SNAPSHOT;
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (raw === cachedRawLayout) {
      return cachedParsedLayout;
    }
    cachedRawLayout = raw;
    cachedParsedLayout = raw ? parseDashboardLayout(raw) : DEFAULT_LAYOUT_SNAPSHOT;
    return cachedParsedLayout;
  } catch {
    return DEFAULT_LAYOUT_SNAPSHOT;
  }
}

export function subscribeDashboardLayout(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DASHBOARD_LAYOUT_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LAYOUT_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LAYOUT_CHANGE_EVENT, onStoreChange);
  };
}

export function writeDashboardLayoutToStorage(next: DashboardLayoutState | null): void {
  if (typeof window === "undefined") return;
  try {
    if (next === null) {
      window.localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      cachedRawLayout = null;
      cachedParsedLayout = DEFAULT_LAYOUT_SNAPSHOT;
    } else {
      const serialized = JSON.stringify(next);
      window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, serialized);
      cachedRawLayout = serialized;
      cachedParsedLayout = next;
    }
    window.dispatchEvent(new Event(LAYOUT_CHANGE_EVENT));
  } catch (error) {
    console.error("Erro ao salvar layout do dashboard no localStorage:", error);
  }
}
