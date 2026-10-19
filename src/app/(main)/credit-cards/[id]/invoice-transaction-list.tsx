"use client";

import { deleteTransaction } from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Search, Trash, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionStatusToggle } from "./transaction-status-toggle";

interface CategoryOption {
  id: number;
  name: string;
  type?: string;
  icon?: string | null;
  subcategories?: {
    id: number;
    name: string;
    categoryId: number;
  }[];
}

interface Transaction {
  id: number;
  date?: string;
  dueDate?: string;
  launchDate?: string;
  description: string;
  amount: string | number;
  status: string;
  type: string;
  categoryId?: number | null;
  subcategoryId?: number | null;
  accountId?: number | null;
  creditCardId?: number | null;
  category?: { id?: number; name: string; icon?: string | null } | null;
  subcategory?: { id?: number; name: string; categoryId?: number } | null;
  competencyMonth?: string;
  fixedTransactionId?: string | null;
  installmentTotal?: number | null;
}

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function InvoiceTransactionList({
  transactions,
  categories = [],
}: {
  transactions: Transaction[];
  categories?: CategoryOption[];
}) {
  const [sortField, setSortField] = useState<"date" | "description" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");

  const availableCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        icon?: string | null;
        subcategories: Map<string, { id: string; name: string; categoryName: string }>;
      }
    >();

    for (const cat of categories) {
      if (cat.type && cat.type !== "expense") continue;
      const catId = String(cat.id);
      const subMap = new Map<string, { id: string; name: string; categoryName: string }>();
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          subMap.set(String(sub.id), { id: String(sub.id), name: sub.name, categoryName: cat.name });
        }
      }
      map.set(catId, {
        id: catId,
        name: cat.name,
        icon: cat.icon,
        subcategories: subMap,
      });
    }

    for (const tx of transactions) {
      if (tx.categoryId && tx.category) {
        const catId = String(tx.categoryId);
        if (!map.has(catId)) {
          map.set(catId, {
            id: catId,
            name: tx.category.name,
            icon: tx.category.icon,
            subcategories: new Map(),
          });
        }
        const catEntry = map.get(catId)!;
        if (tx.subcategoryId && tx.subcategory) {
          const subId = String(tx.subcategoryId);
          if (!catEntry.subcategories.has(subId)) {
            catEntry.subcategories.set(subId, {
              id: subId,
              name: tx.subcategory.name,
              categoryName: catEntry.name,
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, transactions]);

  const availableSubcategories = useMemo(() => {
    if (selectedCategory !== "all") {
      const cat = availableCategories.find((c) => c.id === selectedCategory);
      if (!cat) return [];
      return Array.from(cat.subcategories.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    const allSubs: { id: string; name: string; categoryName: string }[] = [];
    for (const cat of availableCategories) {
      for (const sub of cat.subcategories.values()) {
        allSubs.push(sub);
      }
    }
    return allSubs.sort((a, b) => a.name.localeCompare(b.name) || a.categoryName.localeCompare(b.categoryName));
  }, [availableCategories, selectedCategory]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory("all");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    minAmount > 0 ||
    maxAmount > 0 ||
    selectedCategory !== "all" ||
    selectedSubcategory !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setMinAmount(0);
    setMaxAmount(0);
    setSelectedCategory("all");
    setSelectedSubcategory("all");
  };

  const handleDelete = async (mode: "single" | "future" = "single") => {
    if (!transactionToDelete) return;
    setIsDeleting(true);

    const isVirtual = transactionToDelete.id < 0;
    const fixedId = transactionToDelete.fixedTransactionId ?? undefined;

    const result = await deleteTransaction(transactionToDelete.id, mode, isVirtual, fixedId);

    if (result && !result.success && result.error) {
      alert(result.error);
    }

    setIsDeleting(false);
    setTransactionToDelete(null);
  };

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());

    return transactions.filter((tx) => {
      if (normalizedQuery) {
        const normalizedDesc = normalizeText(tx.description || "");
        if (!normalizedDesc.includes(normalizedQuery)) {
          return false;
        }
      }

      if (selectedCategory !== "all") {
        if (String(tx.categoryId ?? "") !== selectedCategory) {
          return false;
        }
      }

      if (selectedSubcategory !== "all") {
        if (String(tx.subcategoryId ?? "") !== selectedSubcategory) {
          return false;
        }
      }

      const absAmount = Math.abs(Number(tx.amount));
      if (minAmount > 0 && absAmount < minAmount) {
        return false;
      }
      if (maxAmount > 0 && absAmount > maxAmount) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, selectedCategory, selectedSubcategory, minAmount, maxAmount]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        const dateA = new Date(a.launchDate || a.dueDate || a.date || 0).getTime();
        const dateB = new Date(b.launchDate || b.dueDate || b.date || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortField === "description") {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === "amount") {
        comparison = Number(a.amount) - Number(b.amount);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  const filteredTotalAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const amount = Number(tx.amount);
      return amount > 0 ? acc + amount : acc;
    }, 0);
  }, [filteredTransactions]);

  const handleSort = (field: "date" | "description" | "amount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field: "date" | "description" | "amount") => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  return (
    <>
      <div className="mb-4 p-3 sm:p-4 rounded-xl border bg-muted/20 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pesquisa por nome */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice-search" className="text-xs font-medium text-muted-foreground">
              Pesquisar por nome
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="invoice-search"
                type="text"
                placeholder="Buscar descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-9 bg-background text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice-category" className="text-xs font-medium text-muted-foreground">
              Categoria
            </Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger id="invoice-category" className="w-full h-9 bg-background text-sm">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon || "Tag"} className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategoria */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice-subcategory" className="text-xs font-medium text-muted-foreground">
              Subcategoria
            </Label>
            <Select
              value={selectedSubcategory}
              onValueChange={setSelectedSubcategory}
              disabled={availableSubcategories.length === 0}
            >
              <SelectTrigger id="invoice-subcategory" className="w-full h-9 bg-background text-sm">
                <SelectValue placeholder="Todas as subcategorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as subcategorias</SelectItem>
                {availableSubcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {selectedCategory === "all" ? `${sub.name} (${sub.categoryName})` : sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Faixa de Valor */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Faixa de valor</Label>
            <div className="grid grid-cols-2 gap-2">
              <CurrencyInput
                name="minAmount"
                value={minAmount}
                onValueChange={setMinAmount}
                placeholder="Mínimo"
                aria-label="Valor mínimo"
                className="h-9 bg-background text-sm"
              />
              <CurrencyInput
                name="maxAmount"
                value={maxAmount}
                onValueChange={setMaxAmount}
                placeholder="Máximo"
                aria-label="Valor máximo"
                className="h-9 bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <span>
              Exibindo <strong className="text-foreground">{sortedTransactions.length}</strong> de{" "}
              <strong className="text-foreground">{transactions.length}</strong> despesas • Total filtrado:{" "}
              <strong className="text-foreground">{formatCurrency(filteredTotalAmount)}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed space-y-3">
          <p>Nenhuma despesa encontrada para os filtros selecionados.</p>
          {hasActiveFilters && (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer px-1 sm:px-4" onClick={() => handleSort("date")}>
                  <div className="flex items-center">Data {renderSortIcon("date")}</div>
                </TableHead>
                <TableHead className="cursor-pointer px-1 sm:px-4" onClick={() => handleSort("description")}>
                  <div className="flex items-center">Descrição {renderSortIcon("description")}</div>
                </TableHead>
                <TableHead className="cursor-pointer px-1 sm:px-4" onClick={() => handleSort("amount")}>
                  <div className="flex items-center">Valor {renderSortIcon("amount")}</div>
                </TableHead>
                <TableHead className="text-right px-1 sm:px-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium whitespace-nowrap px-1 sm:px-4 py-2 sm:py-4">
                    {formatDate(tx.launchDate || tx.dueDate || tx.date || "")}
                  </TableCell>
                  <TableCell className="max-w-[90px] sm:max-w-[250px] px-1 sm:px-4 py-2 sm:py-4">
                    <div className="flex flex-col overflow-hidden">
                      <span
                        className="font-medium truncate text-[11px] sm:text-sm leading-tight"
                        title={tx.description}
                      >
                        {tx.description}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] sm:text-xs text-muted-foreground mt-0.5 overflow-hidden">
                        <span
                          className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-[2px] truncate"
                          title={tx.category?.name || "Sem categoria"}
                        >
                          {tx.category?.name || "Sem categoria"}
                        </span>
                        {tx.subcategory?.name && (
                          <span
                            className="bg-muted text-muted-foreground font-medium px-1.5 py-0.5 rounded-[2px] truncate"
                            title={tx.subcategory.name}
                          >
                            {tx.subcategory.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className={`font-semibold text-[11px] sm:text-sm px-1 sm:px-4 py-2 sm:py-4 ${Number(tx.amount) < 0 ? "text-green-600" : tx.status === "paid" ? "text-green-600" : "text-red-500"}`}
                  >
                    {formatCurrency(Number(tx.amount))}
                  </TableCell>
                  <TableCell className="text-right px-1 sm:px-4 py-2 sm:py-4">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-2">
                      <TransactionStatusToggle transactionId={tx.id} initialStatus={tx.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => setEditingTransaction(tx)}
                      >
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTransactionToDelete(tx)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-6 w-6 sm:h-8 sm:w-8"
                      >
                        <Trash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditTransactionDialog
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />

      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[500px]">
          {transactionToDelete &&
          (transactionToDelete.fixedTransactionId ||
            (transactionToDelete.installmentTotal && transactionToDelete.installmentTotal > 1)) ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação recorrente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta transação faz parte de uma série recorrente ou parcelada. Deseja excluir apenas esta parcela ou
                  esta e todas as próximas?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 flex-wrap sm:justify-end">
                <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("single");
                  }}
                  disabled={isDeleting}
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground cursor-pointer"
                >
                  Apenas esta
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("future");
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Esta e as próximas"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta transação permanentemente? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("single");
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
