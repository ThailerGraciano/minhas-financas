import { Field, GlassCard } from "./glass-card";
import { DatePicker } from "@/components/ui/date-picker";
import React from "react";

export interface DatesCardProps {
  launchDate: string;
  onLaunchDateChange: (value: string) => void;
  effectiveDueDate: string;
  onDueDateChange: (value: string) => void;
  isCreditCard: boolean;
}

export const DatesCard = React.memo(function DatesCard({
  launchDate,
  onLaunchDateChange,
  effectiveDueDate,
  onDueDateChange,
  isCreditCard,
}: DatesCardProps) {
  return (
    <GlassCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Data de lançamento">
          <DatePicker
            value={launchDate}
            onChange={onLaunchDateChange}
            className="h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
            popoverContentClassName="z-[120] rounded-2xl border border-white/10 bg-[#111A2A]/95 p-3 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          />
        </Field>
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Data de vencimento</span>
              {isCreditCard && (
                <span className="text-[11px] text-[#718096]">(Pela fatura)</span>
              )}
            </span>
          }
        >
          <DatePicker
            value={effectiveDueDate}
            onChange={onDueDateChange}
            disabled={isCreditCard}
            className="h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            popoverContentClassName="z-[120] rounded-2xl border border-white/10 bg-[#111A2A]/95 p-3 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          />
        </Field>
      </div>
    </GlassCard>
  );
});

