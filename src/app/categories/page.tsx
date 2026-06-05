import { getCategories } from '@/app/actions/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddCategoryDialog, AddSubcategoryForm, CategoryActions } from './client-components';
import { CategoryIcon } from '@/components/category-icon';

type CategoriesData = Awaited<ReturnType<typeof getCategories>>;
type Category = CategoriesData[0];
type Subcategory = Category['subcategories'][0];

export default async function CategoriesPage() {
  const categories = await getCategories();

  const expenseCategories = categories.filter((c: Category) => c.type === 'expense');
  const incomeCategories = categories.filter((c: Category) => c.type === 'income');

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Gerencie suas categorias e subcategorias.</p>
        </div>
        <AddCategoryDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Despesas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Despesas
          </h2>
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria de despesa cadastrada.</p>
          ) : (
            expenseCategories.map((cat: Category) => (
              <Card key={cat.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CategoryIcon name={cat.icon} className="h-5 w-5 text-red-500" />
                    {cat.name}
                  </CardTitle>
                  <CategoryActions category={cat} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cat.subcategories && cat.subcategories.length > 0 ? (
                      <ul className="space-y-1">
                        {cat.subcategories.map((sub: Subcategory) => (
                          <li key={sub.id} className="text-sm text-muted-foreground flex items-center before:content-[''] before:w-1 before:h-1 before:bg-muted-foreground before:rounded-full before:mr-2">
                            {sub.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sem subcategorias</p>
                    )}
                    <AddSubcategoryForm categoryId={String(cat.id)} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Receitas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Receitas
          </h2>
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria de receita cadastrada.</p>
          ) : (
            incomeCategories.map((cat: Category) => (
              <Card key={cat.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CategoryIcon name={cat.icon} className="h-5 w-5 text-green-500" />
                    {cat.name}
                  </CardTitle>
                  <CategoryActions category={cat} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cat.subcategories && cat.subcategories.length > 0 ? (
                      <ul className="space-y-1">
                        {cat.subcategories.map((sub: Subcategory) => (
                          <li key={sub.id} className="text-sm text-muted-foreground flex items-center before:content-[''] before:w-1 before:h-1 before:bg-muted-foreground before:rounded-full before:mr-2">
                            {sub.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sem subcategorias</p>
                    )}
                    <AddSubcategoryForm categoryId={String(cat.id)} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
