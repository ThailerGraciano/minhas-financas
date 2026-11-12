import {
  TRANSACTION_ACCENTS,
  type AccentColorConfig,
  type TransactionTab,
} from "@/components/transaction-theme";
import { DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import React from "react";

export interface FormHeaderProps {
  tab: TransactionTab;
  accent: AccentColorConfig;
  onTabChange: (value: TransactionTab) => void;
}

export const FormHeader = React.memo(function FormHeader({
  tab,
  accent,
  onTabChange,
}: FormHeaderProps) {
  return (
    <DialogHeader
      className="shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-3.5 space-y-0"
      style={{
        background: "rgba(17, 26, 42, 0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.10)",
      }}
    >
      <DialogTitle className="sr-only">Nova transação</DialogTitle>

      {/* Mobile sheet pull handle */}
      <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2 sm:hidden shrink-0" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-wide text-[#F2F5FA]">
            Nova transação
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors duration-300 flex items-center gap-1.5"
            style={{
              backgroundColor: accent.softBg,
              borderColor: accent.border,
              borderWidth: 1,
              color: accent.primary,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: accent.primary }}
            />
            {accent.name}
          </span>
        </div>

        <DialogClose asChild>
          <button
            type="button"
            className="size-8 rounded-full flex items-center justify-center text-[#A7B3C5] hover:text-[#F2F5FA] bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </DialogClose>
      </div>

      {/* Segmented control for Type */}
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#0B1220]/70 p-1 border border-white/[0.06] backdrop-blur-md">
        {(["expense", "income", "transfer"] as TransactionTab[]).map((item) => {
          const isSelected = tab === item;
          const tabConfig = TRANSACTION_ACCENTS[item];
          return (
            <button
              key={item}
              type="button"
              onClick={() => onTabChange(item)}
              className="relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-200 cursor-pointer"
              style={
                isSelected
                  ? {
                      backgroundColor: tabConfig.elevatedBg,
                      borderColor: tabConfig.border,
                      borderWidth: 1,
                      color: "#F2F5FA",
                      boxShadow: `0 2px 10px ${tabConfig.subtleGlow}`,
                    }
                  : {
                      color: "#A7B3C5",
                    }
              }
            >
              <span
                className="size-2 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: tabConfig.primary,
                  transform: isSelected ? "scale(1.15)" : "scale(1)",
                  boxShadow: isSelected ? `0 0 8px ${tabConfig.primary}` : "none",
                }}
              />
              <span>{tabConfig.name}</span>
            </button>
          );
        })}
      </div>
    </DialogHeader>
  );
});

