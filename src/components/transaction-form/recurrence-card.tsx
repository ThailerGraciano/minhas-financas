import { Field, GlassCard } from "./glass-card";
import { type RecurrenceKind } from "./types";
import { type AccentColorConfig } from "@/components/transaction-theme";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Switch } from "@/components/ui/switch";
import { Calendar, RefreshCw, Zap } from "lucide-react";
import React from "react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export interface RecurrenceCardProps {
  accent: AccentColorConfig;
  kind: RecurrenceKind;
  onKindChange: (value: RecurrenceKind) => void;
  installment: string;
  onInstallmentChange: (value: string) => void;
  totalInstallments: string;
  onTotalInstallmentsChange: (value: string) => void;
  isTotalAmount: boolean;
  onIsTotalAmountChange: (value: boolean) => void;
  monthlyAmount: number;
}

export const RecurrenceCard = React.memo(function RecurrenceCard({
  accent,
  kind,
  onKindChange,
  installment,
  onInstallmentChange,
  totalInstallments,
  onTotalInstallmentsChange,
  isTotalAmount,
  onIsTotalAmountChange,
  monthlyAmount,
}: RecurrenceCardProps) {
  return (
    <GlassCard className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">
          Modalidade / Recorrência
        </Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <SelectableCard
            icon={<Zap />}
            title="Única"
            subtitle="Sem repetição"
            selected={kind === "single"}
            onClick={() => onKindChange("single")}
            activeAccent={accent}
          />
          <SelectableCard
            icon={<RefreshCw />}
            title="Fixa"
            subtitle="Mensal · 12x"
            selected={kind === "fixed"}
            onClick={() => onKindChange("fixed")}
            activeAccent={accent}
          />
          <SelectableCard
            icon={<Calendar />}
            title="Parcelada"
            subtitle="Dividir valor"
            selected={kind === "installment"}
            onClick={() => onKindChange("installment")}
            activeAccent={accent}
          />
        </div>
      </div>

      {kind === "installment" && (
        <div className="rounded-xl p-3.5 flex flex-col gap-3 transition-all duration-200 bg-[var(--card)]/90 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcela inicial">
              <Input
                type="number"
                min={1}
                value={installment}
                onChange={(e) => onInstallmentChange(e.target.value)}
                className="h-10 rounded-xl bg-background/80 border-border text-foreground"
              />
            </Field>
            <Field label="Total de parcelas">
              <Input
                type="number"
                min={2}
                value={totalInstallments}
                onChange={(e) => onTotalInstallmentsChange(e.target.value)}
                className="h-10 rounded-xl bg-background/80 border-border text-foreground"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Label className="text-xs text-muted-foreground">
              O valor digitado é o total da compra?
            </Label>
            <Switch
              checked={isTotalAmount}
              onCheckedChange={onIsTotalAmountChange}
              style={
                isTotalAmount
                  ? {
                      backgroundColor: accent.primary,
                    }
                  : undefined
              }
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Serão geradas {totalInstallments} parcelas de {money(monthlyAmount)} (residual ajustado na última).
          </p>
        </div>
      )}
    </GlassCard>
  );
});

