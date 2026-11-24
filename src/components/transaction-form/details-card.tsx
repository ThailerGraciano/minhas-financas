import { QuickCategoryDialog } from "@/components/quick-category-dialog";
import { type TransactionTab } from "@/components/transaction-theme";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderByMostUsedCategory } from "@/lib/category-utils";
import { cn } from "@/lib/utils";
import { ReceiptText } from "lucide-react";
import React from "react";
import { AccountSelect } from "./account-select";
import { Field, GlassCard } from "./glass-card";
import { type Account, type Category, type Subcategory, type TransactionFormErrors } from "./types";

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
  errors?: TransactionFormErrors;
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
  errors,
}: DetailsCardProps) {
  const orderedCategories = React.useMemo(() => orderByMostUsedCategory(categories), [categories]);

  return (
    <GlassCard className="space-y-4">
      <Field label="Descrição" required fieldName="description" error={errors?.description}>
        <div className="relative">
          <ReceiptText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            aria-invalid={Boolean(errors?.description) || undefined}
            placeholder={
              tab === "expense"
                ? "Ex: Supermercado, Almoço..."
                : tab === "income"
                  ? "Ex: Salário, Rendimentos..."
                  : "Ex: PIX entre contas..."
            }
            className={cn(
              "h-11 pl-10 rounded-xl bg-input/90 hover:bg-input border-border hover:border-white/20 text-foreground placeholder:text-muted-foreground transition-all duration-200",
              errors?.description && "border-destructive/80 ring-1 ring-destructive/40 hover:border-destructive",
            )}
            style={{
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          />
        </div>
      </Field>

      {tab !== "transfer" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Categoria" required fieldName="categoryId" error={errors?.categoryId}>
            <div className="flex items-center gap-2">
              <Select value={categoryId} onValueChange={onCategoryChange}>
                <SelectTrigger
                  aria-invalid={Boolean(errors?.categoryId) || undefined}
                  className={cn(
                    "w-full flex-1 !h-11 rounded-xl px-3.5 bg-input/90 hover:bg-input border-border hover:border-white/20 text-foreground transition-all duration-200",
                    errors?.categoryId && "border-destructive/80 ring-1 ring-destructive/40 hover:border-destructive",
                  )}
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="z-[120] rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  {orderedCategories.map((item: Category) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                      className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-popover-foreground rounded-lg cursor-pointer"
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <QuickCategoryDialog
                type={tab === "income" ? "income" : "expense"}
                triggerClassName="!h-11 !w-11 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] text-muted-foreground hover:text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer"
                onSuccess={onQuickCategoryCreated}
              />
            </div>
          </Field>

          <Field label="Subcategoria" required fieldName="subcategoryId" error={errors?.subcategoryId}>
            <div className="flex items-center gap-2">
              <Select value={subcategoryId} onValueChange={onSubcategoryChange} disabled={!categoryId}>
                <SelectTrigger
                  aria-invalid={Boolean(errors?.subcategoryId) || undefined}
                  className={cn(
                    "w-full flex-1 !h-11 rounded-xl px-3.5 bg-input/90 hover:bg-input border-border hover:border-white/20 text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    errors?.subcategoryId && "border-destructive/80 ring-1 ring-destructive/40 hover:border-destructive",
                  )}
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="z-[120] rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  {subcategories.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                      className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-popover-foreground rounded-lg cursor-pointer"
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
          <Field label="Conta de origem (Sai)" required fieldName="originId" error={errors?.originId}>
            <AccountSelect
              value={originId}
              onChange={onOriginChange}
              accounts={accounts}
              invalid={Boolean(errors?.originId)}
            />
          </Field>
          <Field label="Conta de destino (Entra)" required fieldName="destinationId" error={errors?.destinationId}>
            <AccountSelect
              value={destinationId}
              onChange={onDestinationChange}
              accounts={accounts}
              invalid={Boolean(errors?.destinationId)}
            />
          </Field>
        </div>
      )}
    </GlassCard>
  );
});
