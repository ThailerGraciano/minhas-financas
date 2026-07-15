'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Loader2, Plus } from 'lucide-react';
import { CATEGORY_ICONS_LIST, CategoryIcon } from '@/components/category-icon';
import {
  toggleCategoryPrediction,
  toggleSubcategoryPrediction,
  deleteCategory,
  deleteSubcategory,
  updateCategoryName,
  updateSubcategoryName,
  updateCategoryIcon,
  createSubcategory,
} from '@/app/actions/categories';

export type Subcategory = {
  id: number;
  name: string;
  isPredictable: boolean;
};

export type Category = {
  id: number;
  name: string;
  icon: string;
  type: string;
  isPredictable: boolean;
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(category.name);
  const [isPending, setIsPending] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    setIsEditingName(false);
    if (name !== category.name && name.trim() !== '') {
      setIsPending(true);
      const res = await updateCategoryName(category.id, name.trim());
      setIsPending(false);
      if (!res.success) {
        setName(category.name);
        alert(res.error || 'Erro ao atualizar nome');
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
    if (!res.success) alert(res.error || 'Erro ao atualizar ícone');
  };

  const handleTogglePrediction = async (checked: boolean) => {
    setIsPending(true);
    const res = await toggleCategoryPrediction(category.id, checked);
    setIsPending(false);
    if (!res.success) alert(res.error || 'Erro ao atualizar previsão');
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a categoria ${category.name}?`)) return;
    setIsPending(true);
    const res = await deleteCategory(category.id);
    setIsPending(false);
    if (!res.success) alert(res.error || 'Erro ao excluir categoria');
  };

  return (
    <AccordionItem value={category.id.toString()} className="border rounded-lg bg-card text-card-foreground shadow-sm px-4">
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-1 items-center gap-3">
          {/* Ícone via Popover */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${category.type === 'expense' ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-green-500 hover:text-green-600 hover:bg-green-50'}`}
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
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setName(category.name);
                  setIsEditingName(false);
                }
              }}
              className="h-8 w-full max-w-[200px]"
              disabled={isPending}
            />
          ) : (
            <span
              className="text-lg font-semibold cursor-text hover:bg-muted/50 px-2 py-0.5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
            >
              {name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-muted-foreground">Previsão</span>
            <Switch
              checked={category.isPredictable}
              onCheckedChange={handleTogglePrediction}
              disabled={isPending}
            />
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          
          <AccordionTrigger className="w-8 justify-center py-0" />
        </div>
      </div>

      <AccordionContent className="pt-2 pb-4">
        <div className="pl-12 space-y-2">
          {category.subcategories && category.subcategories.length > 0 ? (
            <ul className="space-y-1">
              {category.subcategories.map((sub) => (
                <SubcategoryItem key={sub.id} subcategory={sub} />
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

function SubcategoryItem({ subcategory }: { subcategory: Subcategory }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(subcategory.name);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    setIsEditingName(false);
    if (name !== subcategory.name && name.trim() !== '') {
      setIsPending(true);
      const res = await updateSubcategoryName(subcategory.id, name.trim());
      setIsPending(false);
      if (!res.success) {
        setName(subcategory.name);
        alert(res.error || 'Erro ao atualizar nome');
      }
    } else {
      setName(subcategory.name);
    }
  };

  const handleTogglePrediction = async (checked: boolean) => {
    setIsPending(true);
    const res = await toggleSubcategoryPrediction(subcategory.id, checked);
    setIsPending(false);
    if (!res.success) alert(res.error || 'Erro ao atualizar previsão');
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a subcategoria ${subcategory.name}?`)) return;
    setIsPending(true);
    const res = await deleteSubcategory(subcategory.id);
    setIsPending(false);
    if (!res.success) alert(res.error || 'Erro ao excluir subcategoria');
  };

  return (
    <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
        {isEditingName ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') {
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

      <div className="flex items-center gap-3">
        <Switch
          checked={subcategory.isPredictable}
          onCheckedChange={handleTogglePrediction}
          disabled={isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      </div>
    </li>
  );
}

function QuickAddSubcategory({ categoryId }: { categoryId: number }) {
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsPending(true);
    const res = await createSubcategory(name.trim(), categoryId.toString());
    setIsPending(false);
    if (res.success) {
      setName('');
    } else {
      alert(res.error || 'Erro ao adicionar subcategoria');
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
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
        disabled={isPending || !name.trim()}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
}
