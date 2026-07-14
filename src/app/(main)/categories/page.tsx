import { getCategories } from '@/app/actions/categories';
import { AddCategoryDialog } from './client-components';
import { CategoryTree, Category } from './category-tree';

export default async function CategoriesPage() {
  const categories = await getCategories();

  // Cast para o tipo esperado pela CategoryTree
  // A tipagem original possui nullable em isPredictable? Nós adicionamos isPredictable, então vamos garantir que bata com o CategoryTree.
  const mappedCategories: Category[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    type: c.type,
    isPredictable: c.isPredictable ?? false,
    subcategories: c.subcategories.map((s) => ({
      id: s.id,
      name: s.name,
      isPredictable: s.isPredictable ?? false,
    }))
  }));

  const expenseCategories = mappedCategories.filter((c) => c.type === 'expense');
  const incomeCategories = mappedCategories.filter((c) => c.type === 'income');

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Gerencie suas categorias e subcategorias.</p>
        </div>
        <AddCategoryDialog />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Despesas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Despesas
          </h2>
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria de despesa cadastrada.</p>
          ) : (
            <CategoryTree categories={expenseCategories} />
          )}
        </div>

        {/* Receitas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Receitas
          </h2>
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria de receita cadastrada.</p>
          ) : (
            <CategoryTree categories={incomeCategories} />
          )}
        </div>
      </div>
    </div>
  );
}
