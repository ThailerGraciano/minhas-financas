import { type Account } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export interface AccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
  placeholder?: string;
}

export const AccountSelect = React.memo(function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder = "Selecionar conta",
}: AccountSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-full !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {accounts.map((item: Account) => (
          <SelectItem
            key={item.id}
            value={String(item.id)}
            className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span>{item.name}</span>
              {item.currentBalance != null ? (
                <span className="text-xs text-[#718096]">
                  {money(Number(item.currentBalance))}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

