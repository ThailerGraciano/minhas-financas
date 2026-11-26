"use client";

import {
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  toggleCategoryPrediction,
  toggleSubcategoryPrediction,
  updateCategoryIcon,
  updateCategoryName,
  updateSubcategoryName,
} from "@/app/actions/categories";
import { updateCategoryDefaultConsumptionNature } from "@/app/actions/consumption-intelligence";
import { CATEGORY_ICONS_LIST, CategoryIcon } from "@/components/category-icon";
import { NATURE_META, SELECTABLE_NATURES } from "@/components/consumption-intelligence/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isDefaultConsumptionNature, type DefaultConsumptionNature } from "@/lib/consumption-types";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type Subcategory = {
  id: number;
  name: string;
  isPredictable: boolean;
  defaultConsumptionNature: DefaultConsumptionNature | null;
};

export type Category = {
  id: number;
  name: string;
  icon: string;
  type: string;
  isPredictable: boolean;
  defaultConsumptionNature: DefaultConsumptionNature | null;
  subcategories: Subcategory[];
};

export function CategoryTree({ categories }: { categories: Category[] }) {
  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {categories.map((category) => (
        <CategoryAccordionItem key={category.id} category={category} />
      ))}
    </Accordion>
  );
}

function CategoryAccordionItem({ category }: { category: Category }) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(category.name);
  const [defaultNature, setDefaultNature] = useState<DefaultConsumptionNature | null>(
    category.defaultConsumptionNature,
  );
  const [prevCatNature, setPrevCatNature] = useState(category.defaultConsumptionNature);
  const [isPending, setIsPending] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (category.defaultConsumptionNature !== prevCatNature) {
    setPrevCatNature(category.defaultConsumptionNature);
    setDefaultNature(category.defaultConsumptionNature);
  }

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    setIsEditingName(false);
    if (name !== category.name && name.trim() !== "") {
      setIsPending(true);
      const res = await updateCategoryName(category.id, name.trim());
      setIsPending(false);
      if (!res.success) {
        setName(category.name);
        alert(res.error || "Erro ao atualizar nome");
      }
    } else {
      setName(category.name);
    }
  };

  const handleUpdateIcon = async (iconName: string) => {
    setIsPopoverOpen(false);
    setIsPending(true);
    const res = await updateCategoryIcon(category.id, iconName);
    setIsPending(false);
    if (!res.success) alert(res.error || "Erro ao atualizar ícone");
  };

  const handleTogglePrediction = async (checked: boolean) => {
    setIsPending(true);
    const res = await toggleCategoryPrediction(category.id, checked);
    setIsPending(false);
    if (!res.success) alert(res.error || "Erro ao atualizar previsão");
  };

  const handleNatureChange = async (value: string) => {
    const nextNature = value === "__none__" ? null : isDefaultConsumptionNature(value) ? value : null;
    const prev = defaultNature;
    setDefaultNature(nextNature);
    setIsPending(true);
    const res = await updateCategoryDefaultConsumptionNature({
      categoryId: category.id,
      nature: nextNature,
    });
    setIsPending(false);
    if (!res.success) {
      setDefaultNature(prev);
      toast.error(res.error || "Erro ao atualizar natureza da categoria.");
      return;
    }
    toast.success(
      nextNature
        ? `Natureza padrão de "${category.name}" definida como ${NATURE_META[nextNature].label}.`
        : `Natureza padrão de "${category.name}" definida como Não definido.`,
    );
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a categoria ${category.name}?`)) return;
    setIsPending(true);
    const res = await deleteCategory(category.id);
    setIsPending(false);
    if (!res.success) alert(res.error || "Erro ao excluir categoria");
  };

  return (
    <AccordionItem
      value={category.id.toString()}
      className="border border-white/[0.08] rounded-2xl bg-card/85 backdrop-blur-md text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.3)] px-4 mb-2.5 transition-all hover:bg-card/95 hover:border-white/15 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
        <div className="flex flex-1 items-center gap-3 min-w-[160px]">
          {/* Ícone via Popover */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${category.type === "expense" ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50"}`}
                isLoading={isPending}
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
              >
                <CategoryIcon name={category.icon} className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start" side="bottom">
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {CATEGORY_ICONS_LIST.map(({ name: iconName, Icon }) => (
                  <button
                    key={iconName}
                    onClick={() => handleUpdateIcon(iconName)}
                    className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Nome Inline Edit */}
          {isEditingName ? (
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setName(category.name);
                  setIsEditingName(false);
                }
              }}
              className="h-8 w-full max-w-[200px]"
              disabled={isPending}
            />
          ) : (
            <span
              className="text-lg font-semibold cursor-text hover:bg-muted/50 px-2 py-0.5 rounded transition-colors truncate"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
            >
              {name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 ml-auto">
          {category.type === "expense" && (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={defaultNature ?? "__none__"}
                onValueChange={handleNatureChange}
                disabled={isPending}
              >
                <SelectTrigger
                  aria-label={`Natureza de consumo padrão de ${category.name}`}
                  className={cn(
                    "h-8 w-[165px] text-xs font-medium",
                    defaultNature
                      ? NATURE_META[defaultNature].badgeClass
                      : "bg-white/[0.03] border-white/[0.08] text-muted-foreground",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">
                    Não definido
                  </SelectItem>
                  {SELECTABLE_NATURES.map((nat) => (
                    <SelectItem key={nat} value={nat} className="text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: NATURE_META[nat].dotColor }}
                        />
                        <span>{NATURE_META[nat].label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs sm:text-sm text-muted-foreground">Previsão</span>
            <Switch checked={category.isPredictable} onCheckedChange={handleTogglePrediction} disabled={isPending} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <AccordionTrigger className="w-8 justify-center py-0" />
        </div>
      </div>

      <AccordionContent className="pt-2 pb-4">
        <div className="pl-4 sm:pl-12 space-y-2">
          {category.subcategories && category.subcategories.length > 0 ? (
            <ul className="space-y-1">
              {category.subcategories.map((sub) => (
                <SubcategoryItem
                  key={sub.id}
                  subcategory={sub}
                  categoryId={category.id}
                  categoryType={category.type}
                  parentNature={defaultNature}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic mb-2">Sem subcategorias cadastradas.</p>
          )}
          <QuickAddSubcategory categoryId={category.id} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SubcategoryItem({
  subcategory,
  categoryId,
  categoryType,
  parentNature,
}: {
  subcategory: Subcategory;
  categoryId: number;
  categoryType: string;
  parentNature: DefaultConsumptionNature | null;
}) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(subcategory.name);
  const [subNature, setSubNature] = useState<DefaultConsumptionNature | null>(
    subcategory.defaultConsumptionNature,
  );
  const [prevSubNature, setPrevSubNature] = useState(subcategory.defaultConsumptionNature);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (subcategory.defaultConsumptionNature !== prevSubNature) {
    setPrevSubNature(subcategory.defaultConsumptionNature);
    setSubNature(subcategory.defaultConsumptionNature);
  }

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    setIsEditingName(false);
    if (name !== subcategory.name && name.trim() !== "") {
      setIsPending(true);
      const res = await updateSubcategoryName(subcategory.id, name.trim());
      setIsPending(false);
      if (!res.success) {
        setName(subcategory.name);
        alert(res.error || "Erro ao atualizar nome");
      }
    } else {
      setName(subcategory.name);
    }
  };

  const handleTogglePrediction = async (checked: boolean) => {
    setIsPending(true);
    const res = await toggleSubcategoryPrediction(subcategory.id, checked);
    setIsPending(false);
    if (!res.success) alert(res.error || "Erro ao atualizar previsão");
  };

  const handleNatureChange = async (value: string) => {
    const nextNature = value === "__inherit__" ? null : isDefaultConsumptionNature(value) ? value : null;
    const prev = subNature;
    setSubNature(nextNature);
    setIsPending(true);
    const res = await updateCategoryDefaultConsumptionNature({
      categoryId,
      subcategoryId: subcategory.id,
      nature: nextNature,
    });
    setIsPending(false);
    if (!res.success) {
      setSubNature(prev);
      toast.error(res.error || "Erro ao atualizar natureza da subcategoria.");
      return;
    }
    toast.success(
      nextNature
        ? `"${subcategory.name}" definida como ${NATURE_META[nextNature].label}.`
        : `"${subcategory.name}" herdará a natureza da categoria pai.`,
    );
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a subcategoria ${subcategory.name}?`)) return;
    setIsPending(true);
    const res = await deleteSubcategory(subcategory.id);
    setIsPending(false);
    if (!res.success) alert(res.error || "Erro ao excluir subcategoria");
  };

  const effectiveNature = subNature ?? parentNature;
  const inheritLabel = parentNature
    ? `Herdar (${NATURE_META[parentNature].shortLabel})`
    : "Herdar (Não definido)";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2 flex-1 min-w-[140px]">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
        {isEditingName ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") {
                setName(subcategory.name);
                setIsEditingName(false);
              }
            }}
            className="h-7 text-sm w-full max-w-[200px]"
            disabled={isPending}
          />
        ) : (
          <span
            className="text-sm cursor-text hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
            onClick={() => setIsEditingName(true)}
          >
            {name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        {categoryType === "expense" && (
          <Select
            value={subNature ?? "__inherit__"}
            onValueChange={handleNatureChange}
            disabled={isPending}
          >
            <SelectTrigger
              aria-label={`Natureza de consumo de ${subcategory.name}`}
              className={cn(
                "h-7 w-[170px] text-[11px] font-medium",
                subNature
                  ? NATURE_META[subNature].badgeClass
                  : effectiveNature
                    ? "bg-white/[0.02] border-white/[0.08] text-foreground/80"
                    : "bg-white/[0.02] border-white/[0.08] text-muted-foreground",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__inherit__" className="text-xs text-muted-foreground">
                {inheritLabel}
              </SelectItem>
              {SELECTABLE_NATURES.map((nat) => (
                <SelectItem key={nat} value={nat} className="text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: NATURE_META[nat].dotColor }}
                    />
                    <span>{NATURE_META[nat].label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Switch checked={subcategory.isPredictable} onCheckedChange={handleTogglePrediction} disabled={isPending} />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          isLoading={isPending}
          disabled={isPending}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </li>
  );
}

function QuickAddSubcategory({ categoryId }: { categoryId: number }) {
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsPending(true);
    const res = await createSubcategory(name.trim(), categoryId.toString());
    setIsPending(false);
    if (res.success) {
      setName("");
    } else {
      alert(res.error || "Erro ao adicionar subcategoria");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Nova subcategoria... + Enter"
        className="h-8 text-sm"
        disabled={isPending}
      />
      <Button
        size="sm"
        variant="secondary"
        className="h-8 shrink-0"
        onClick={handleAdd}
        isLoading={isPending}
        disabled={isPending || !name.trim()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
