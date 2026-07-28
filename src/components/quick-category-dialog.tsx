"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, createSubcategory } from "@/app/actions/categories";
import { CATEGORY_ICONS_LIST } from "@/components/category-icon";

interface QuickCategoryDialogProps {
  type: "income" | "expense";
  onSuccess: (categoryId: string, subcategoryId: string) => void;
  isSubcategoryMode?: boolean;
  parentCategoryId?: string;
  parentCategoryName?: string;
}

export function QuickCategoryDialog({ type, onSuccess, isSubcategoryMode, parentCategoryId, parentCategoryName }: QuickCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Tag");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const subcategoryName = formData.get("subcategoryName") as string;

    if (isSubcategoryMode && parentCategoryId) {
      if (!subcategoryName || subcategoryName.trim() === "") {
        setError("O nome da subcategoria é obrigatório");
        setIsPending(false);
        return;
      }
      
      const subRes = await createSubcategory(subcategoryName.trim(), parentCategoryId);
      if (!subRes.success || !subRes.subcategory) {
        setError(subRes.error || "Erro ao criar subcategoria");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setOpen(false);
      onSuccess(parentCategoryId, String(subRes.subcategory.id));
      return;
    }

    const name = formData.get("name") as string;

    // 1. Create the category
    const res = await createCategory(name, type, selectedIcon);
    
    if (!res.success || !res.category) {
      setError(res.error || "Erro ao criar categoria");
      setIsPending(false);
      return;
    }

    const newCategoryId = res.category.id;
    let newSubcategoryId = "";

    // 2. Optionally create the subcategory if provided
    if (subcategoryName && subcategoryName.trim() !== "" && subcategoryName.trim().toLowerCase() !== "geral") {
      const subRes = await createSubcategory(subcategoryName.trim(), String(newCategoryId));
      if (subRes.success && subRes.subcategory) {
        newSubcategoryId = String(subRes.subcategory.id);
      }
    }

    setIsPending(false);
    setOpen(false);
    setSelectedIcon("Tag"); // Reset for next time
    onSuccess(String(newCategoryId), newSubcategoryId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-xl border-dashed"
          title={isSubcategoryMode ? "Nova subcategoria" : "Nova categoria"}
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] z-[200]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isSubcategoryMode ? "Nova Subcategoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>
              {isSubcategoryMode 
                ? "Crie uma subcategoria vinculada à categoria selecionada."
                : "Crie rapidamente uma categoria para esta transação."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quick-category-name">Nome da Categoria</Label>
              <Input 
                id="quick-category-name" 
                name="name" 
                required={!isSubcategoryMode} 
                disabled={isSubcategoryMode}
                defaultValue={isSubcategoryMode ? parentCategoryName : ""}
                placeholder="Ex: Casa, Lazer..." 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-subcategory-name">
                {isSubcategoryMode ? "Nome da Subcategoria" : "Subcategoria (Opcional)"}
              </Label>
              <Input 
                id="quick-subcategory-name" 
                name="subcategoryName" 
                required={isSubcategoryMode}
                placeholder="Ex: Aluguel, Cinema..." 
              />
              {!isSubcategoryMode && (
                <p className="text-xs text-muted-foreground">
                  Se deixado em branco, a transação usará a subcategoria &quot;Geral&quot;.
                </p>
              )}
            </div>
            
            {!isSubcategoryMode && (
              <div className="grid gap-2">
                <Label>Ícone</Label>
                <div className="grid grid-cols-5 gap-2 p-3 border rounded-md bg-muted/20 max-h-[160px] overflow-y-auto">
                  {CATEGORY_ICONS_LIST.map(({ name, Icon }) => {
                    const isSelected = selectedIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedIcon(name)}
                        className={`flex items-center justify-center p-2 rounded-md transition-all border ${
                          isSelected 
                            ? 'bg-primary border-primary text-primary-foreground scale-105 shadow-sm' 
                            : 'bg-background border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        title={name}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending 
                ? (isSubcategoryMode ? "Criando..." : "Criando...") 
                : (isSubcategoryMode ? "Criar Subcategoria" : "Criar Categoria")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
