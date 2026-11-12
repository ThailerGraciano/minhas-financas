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
        className="w-full !h-11 rounded-xl px-3.5 bg-input/90 hover:bg-input border-border hover:border-white/20 text-foreground transition-all duration-200"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[120] rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {accounts.map((item: Account) => (
          <SelectItem
            key={item.id}
            value={String(item.id)}
            className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-popover-foreground rounded-lg cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span>{item.name}</span>
              {item.currentBalance != null ? (
                <span className="text-xs text-muted-foreground">
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

