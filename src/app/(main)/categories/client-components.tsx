'use client';

import { useState } from 'react';
import { createCategory, createSubcategory, updateCategoryIcon, deleteCategory } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, MoreVertical, Palette, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { CATEGORY_ICONS_LIST } from '@/components/category-icon';

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
            <Select name="type" defaultValue="expense" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
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

export function CategoryActions({ category }: { category: { id: number; name: string; icon: string } }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(category.icon);
  const [isEditPending, setIsEditPending] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpdateIcon = async () => {
    setIsEditPending(true);
    const res = await updateCategoryIcon(category.id, selectedIcon);
    setIsEditPending(false);
    if (res.success) {
      setIsEditDialogOpen(false);
    } else {
      alert(res.error || "Erro ao atualizar ícone");
    }
  };

  const handleDelete = async () => {
    setIsDeletePending(true);
    setDeleteError(null);
    const res = await deleteCategory(category.id);
    setIsDeletePending(false);
    if (res.success) {
      setIsDeleteDialogOpen(false);
    } else {
      setDeleteError(res.error || "Erro ao excluir categoria");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Editar Ícone
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              setDeleteError(null);
              setIsDeleteDialogOpen(true);
            }} 
            className="cursor-pointer text-destructive focus:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Categoria
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Icon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ícone da Categoria</DialogTitle>
            <DialogDescription>
              Selecione um novo ícone para a categoria <strong>{category.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditPending}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateIcon} disabled={isEditPending}>
              {isEditPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Ícone'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{category.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletePending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeletePending}>
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
