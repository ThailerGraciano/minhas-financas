'use client';

import { useState } from 'react';
import { createCategory, createSubcategory } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

import { CATEGORY_ICONS_LIST, CategoryIcon } from '@/components/category-icon';

export function AddCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('Tag');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const type = form.get('type') as 'income' | 'expense';

    const res = await createCategory(name, type, selectedIcon);
    setIsPending(false);
    if (res.success) {
      setOpen(false);
      setSelectedIcon('Tag');
    } else {
      alert("Erro ao criar categoria");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input id="name" name="name" required placeholder="Ex: Moradia, Salário..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo</Label>
            <select id="type" name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          
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

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddSubcategoryForm({ categoryId }: { categoryId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsPending(true);
    const res = await createSubcategory(name, categoryId);
    setIsPending(false);
    
    if (res.success) {
      setName('');
    } else {
      alert("Erro ao criar subcategoria");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <Input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nova subcategoria..." 
        className="h-8 text-sm"
        required
      />
      <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
        Adicionar
      </Button>
    </form>
  );
}
