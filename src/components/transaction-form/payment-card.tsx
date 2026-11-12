import { AccountSelect } from "./account-select";
import { Field, GlassCard } from "./glass-card";
import { type Account, type Card } from "./types";
import { type AccentColorConfig, type TransactionTab } from "@/components/transaction-theme";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectableCard } from "@/components/ui/selectable-card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, Landmark } from "lucide-react";
import React from "react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export interface PaymentCardProps {
  tab: TransactionTab;
  accent: AccentColorConfig;
  payment: "account" | "credit_card";
  onPaymentChange: (value: "account" | "credit_card") => void;
  accountId: string;
  onAccountIdChange: (value: string) => void;
  incomeAccountId: string;
  onIncomeAccountIdChange: (value: string) => void;
  accounts: Account[];
  cardId: string;
  onCardChange: (value: string) => void;
  creditCards: Card[];
  card: Card | undefined;
  invoiceOptions: Date[];
  invoiceMonth: string;
  onInvoiceMonthChange: (value: string) => void;
}

export const PaymentCard = React.memo(function PaymentCard({
  tab,
  accent,
  payment,
  onPaymentChange,
  accountId,
  onAccountIdChange,
  incomeAccountId,
  onIncomeAccountIdChange,
  accounts,
  cardId,
  onCardChange,
  creditCards,
  card,
  invoiceOptions,
  invoiceMonth,
  onInvoiceMonthChange,
}: PaymentCardProps) {
  if (tab === "transfer") return null;

  return (
    <GlassCard className="space-y-4">
      {tab === "expense" && (
        <>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Forma de liquidação
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <SelectableCard
                icon={<Landmark />}
                title="Conta"
                subtitle="Saldo à vista"
                selected={payment === "account"}
                onClick={() => onPaymentChange("account")}
                activeAccent={accent}
              />
              <SelectableCard
                icon={<CreditCard />}
                title="Crédito"
                subtitle="Fatura do cartão"
                selected={payment === "credit_card"}
                onClick={() => onPaymentChange("credit_card")}
                activeAccent={accent}
              />
            </div>
          </div>

          {payment === "account" ? (
            <Field label="Selecione a conta">
              <AccountSelect
                value={accountId}
                onChange={onAccountIdChange}
                accounts={accounts}
              />
            </Field>
          ) : (
            <div className="flex flex-col gap-3">
              <Field
                label={
                  <span className="flex items-center justify-between w-full">
                    <span>Cartão de crédito</span>
                    {card && (
                      <span className="font-medium text-success">
                        Limite: {money(Number(card.creditLimit))}
                      </span>
                    )}
                  </span>
                }
              >
                <Select value={cardId} onValueChange={onCardChange}>
                  <SelectTrigger
                    className="w-full !h-11 rounded-xl px-3.5 bg-input/90 hover:bg-input border-border hover:border-white/20 text-foreground transition-all duration-200"
                    style={{
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <SelectValue placeholder="Selecionar cartão" />
                  </SelectTrigger>
                  <SelectContent className="z-[120] rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                    {creditCards.map((item: Card) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                        className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-popover-foreground rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Fecha dia {item.closingDay} • Vence dia {item.dueDay}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {card && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
                    <span>Fatura de lançamento</span>
                    <span className="text-muted-foreground/80">Fecha dia {card.closingDay}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {invoiceOptions.map((month) => {
                      const value = format(month, "yyyy-MM");
                      const isSelected = invoiceMonth === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onInvoiceMonthChange(value)}
                          className="relative flex flex-col items-center justify-center rounded-2xl border p-2.5 text-sm font-semibold capitalize transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl"
                          style={
                            isSelected
                              ? {
                                  borderColor: accent.border,
                                  background: `linear-gradient(145deg, ${accent.elevatedBg} 0%, rgba(14, 14, 20, 0.90) 100%)`,
                                  color: "var(--foreground)",
                                  boxShadow: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.28), 0 6px 20px -2px ${accent.subtleGlow}`,
                                }
                              : {
                                  borderColor: "rgba(255, 255, 255, 0.08)",
                                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), var(--card)",
                                  color: "var(--muted-foreground)",
                                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                                }
                          }
                        >
                          <span className="font-semibold text-sm">
                            {format(month, "MMM/yy", { locale: ptBR })}
                          </span>
                          <span className="mt-1 block text-xs font-normal normal-case text-muted-foreground">
                            Vence dia {card.dueDay}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "income" && (
        <Field label="Depositar na conta">
          <AccountSelect
            value={incomeAccountId}
            onChange={onIncomeAccountIdChange}
            accounts={accounts}
          />
        </Field>
      )}
    </GlassCard>
  );
});

