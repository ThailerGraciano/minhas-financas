import type {
  ClassificationSource,
  ConfidenceLevel,
  ConsumptionNature,
  DefaultConsumptionNature,
  HistoricalTrend,
  PerformanceStatus,
} from "@/lib/consumption-intelligence";

export const NATURE_META: Record<
  ConsumptionNature,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeClass: string;
    dotColor: string;
  }
> = {
  recurring: {
    label: "Consumo recorrente",
    shortLabel: "Consumo",
    description: "Participa da média histórica e projeção semanal.",
    badgeClass: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
    dotColor: "#00D287",
  },
  installment: {
    label: "Parcelado",
    shortLabel: "Parcelado",
    description: "Compra parcelada acompanhada separadamente do consumo variável.",
    badgeClass: "border-indigo-500/35 bg-indigo-500/12 text-indigo-300",
    dotColor: "#818CF8",
  },
  fixed: {
    label: "Despesa fixa",
    shortLabel: "Fixa",
    description: "Compromisso previsível/recorrente excluído da análise semanal.",
    badgeClass: "border-amber-500/35 bg-amber-500/12 text-amber-400",
    dotColor: "#FBBF24",
  },
  extraordinary: {
    label: "Compra extraordinária",
    shortLabel: "Extraordinária",
    description: "Compra pontual/excepcional (e suas parcelas) excluída do consumo.",
    badgeClass: "border-sky-500/35 bg-sky-500/12 text-sky-400",
    dotColor: "#38BDF8",
  },
  financial_movement: {
    label: "Movimentação financeira",
    shortLabel: "Movimentação",
    description: "Transferência, caixinha, reserva, empréstimo ou pagamento de fatura.",
    badgeClass: "border-violet-500/35 bg-violet-500/12 text-violet-300",
    dotColor: "#A855F7",
  },
  individual_withdrawal: {
    label: "Retirada individual",
    shortLabel: "Retirada",
    description: "Mesada ou retirada pessoal sem impacto direto até o gasto efetivo.",
    badgeClass: "border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-300",
    dotColor: "#E879F9",
  },
  unclassified: {
    label: "Não classificado",
    shortLabel: "Pendente",
    description: "Aguardando confirmação; não participa dos cálculos até ser classificado.",
    badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    dotColor: "#FF4D6D",
  },
};

export const SELECTABLE_NATURES: readonly DefaultConsumptionNature[] = [
  "recurring",
  "extraordinary",
  "fixed",
  "financial_movement",
  "individual_withdrawal",
];

export const ALL_NATURE_OPTIONS: readonly ConsumptionNature[] = [
  "recurring",
  "installment",
  "extraordinary",
  "fixed",
  "financial_movement",
  "individual_withdrawal",
  "unclassified",
];

export const SOURCE_LABELS: Record<ClassificationSource, string> = {
  auto: "Automática",
  manual: "Manual",
  inherited_installment: "Herdada de parcelamento",
};

export const STATUS_META: Record<
  PerformanceStatus,
  {
    label: string;
    badgeClass: string;
    barColor: string;
  }
> = {
  within_expected: {
    label: "Dentro do esperado",
    badgeClass: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
    barColor: "#00D287",
  },
  attention: {
    label: "Atenção",
    badgeClass: "border-amber-500/40 bg-amber-500/12 text-amber-400",
    barColor: "#FBBF24",
  },
  above_expected: {
    label: "Acima do esperado",
    badgeClass: "border-orange-500/40 bg-orange-500/15 text-orange-400",
    barColor: "#FB923C",
  },
  well_above_expected: {
    label: "Muito acima do esperado",
    badgeClass: "border-rose-500/45 bg-rose-500/15 text-rose-400",
    barColor: "#FF4D6D",
  },
  insufficient_data: {
    label: "Sem dados suficientes",
    badgeClass: "border-white/15 bg-white/[0.06] text-muted-foreground",
    barColor: "#820AD1",
  },
  future: {
    label: "Semana futura",
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    barColor: "#64748B",
  },
};

export const CONFIDENCE_META: Record<
  ConfidenceLevel,
  {
    label: string;
    badgeClass: string;
  }
> = {
  high: {
    label: "Alta",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  medium: {
    label: "Média",
    badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  low: {
    label: "Baixa",
    badgeClass: "border-amber-500/35 bg-amber-500/10 text-amber-400",
  },
  insufficient: {
    label: "Insuficiente",
    badgeClass: "border-white/15 bg-white/[0.05] text-muted-foreground",
  },
};

export const TREND_META: Record<
  HistoricalTrend,
  {
    label: string;
    badgeClass: string;
  }
> = {
  increasing: {
    label: "Tendência de alta",
    badgeClass: "border-rose-500/35 bg-rose-500/12 text-rose-400",
  },
  decreasing: {
    label: "Tendência de queda",
    badgeClass: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
  },
  stable: {
    label: "Comportamento estável",
    badgeClass: "border-sky-500/35 bg-sky-500/12 text-sky-400",
  },
  insufficient_data: {
    label: "Histórico insuficiente",
    badgeClass: "border-white/15 bg-white/[0.05] text-muted-foreground",
  },
};

export function formatCurrencyBRL(value: number, showBalance = true): string {
  if (!showBalance) return "••••••";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCompactBRL(value: number, showBalance = true): string {
  if (!showBalance) return "••••";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
