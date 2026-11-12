import { AccountSelect } from "./account-select";
import { Field, GlassCard } from "./glass-card";
import { type Account, type Category, type Subcategory } from "./types";
import { QuickCategoryDialog } from "@/components/quick-category-dialog";
import { type TransactionTab } from "@/components/transaction-theme";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReceiptText } from "lucide-react";
import React from "react";

export interface DetailsCardProps {
  tab: TransactionTab;
  description: string;
  onDescriptionChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: Category[];
  selectedCategory: Category | undefined;
  subcategoryId: string;
  onSubcategoryChange: (value: string) => void;
  subcategories: Subcategory[];
  accounts: Account[];
  originId: string;
  onOriginChange: (value: string) => void;
  destinationId: string;
  onDestinationChange: (value: string) => void;
  onQuickCategoryCreated: (categoryId: string, subcategoryId: string) => void;
}

export const DetailsCard = React.memo(function DetailsCard({
  tab,
  description,
  onDescriptionChange,
  categoryId,
  onCategoryChange,
  categories,
  selectedCategory,
  subcategoryId,
  onSubcategoryChange,
  subcategories,
  accounts,
  originId,
  onOriginChange,
  destinationId,
  onDestinationChange,
  onQuickCategoryCreated,
}: DetailsCardProps) {
  return (
    <GlassCard className="space-y-4">
      <Field label="Descrição">
        <div className="relative">
          <ReceiptText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#718096]" />
          <Input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={
              tab === "expense"
                ? "Ex: Supermercado, Almoço..."
                : tab === "income"
                  ? "Ex: Salário, Rendimentos..."
                  : "Ex: PIX entre contas..."
            }
            className="h-11 pl-10 rounded-xl bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] placeholder:text-[#718096] transition-all duration-200"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          />
        </div>
      </Field>

      {tab !== "transfer" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Categoria">
            <div className="flex items-center gap-2">
              <Select value={categoryId} onValueChange={onCategoryChange}>
                <SelectTrigger
                  className="w-full flex-1 !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  {categories.map((item: Category) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                      className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <QuickCategoryDialog
                type={tab === "income" ? "income" : "expense"}
                triggerClassName="!h-11 !w-11 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] text-[#A7B3C5] hover:text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer"
                onSuccess={onQuickCategoryCreated}
              />
            </div>
          </Field>

          <Field label="Subcategoria">
            <div className="flex items-center gap-2">
              <Select
                value={subcategoryId}
                onValueChange={onSubcategoryChange}
                disabled={!categoryId}
              >
                <SelectTrigger
                  className="w-full flex-1 !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  {subcategories.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                      className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryId ? (
                <QuickCategoryDialog
                  type={tab === "income" ? "income" : "expense"}
                  isSubcategoryMode={true}
                  parentCategoryId={categoryId}
                  parentCategoryName={selectedCategory?.name}
                  triggerClassName="!h-11 !w-11 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] text-[#A7B3C5] hover:text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer"
                  onSuccess={onQuickCategoryCreated}
                />
              ) : null}
            </div>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Conta de origem (Sai)">
            <AccountSelect
              value={originId}
              onChange={onOriginChange}
              accounts={accounts}
            />
          </Field>
          <Field label="Conta de destino (Entra)">
            <AccountSelect
              value={destinationId}
              onChange={onDestinationChange}
              accounts={accounts}
            />
          </Field>
        </div>
      )}
    </GlassCard>
  );
});

