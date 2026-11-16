"use client";

import { processBatchUpdates } from "@/app/actions/batch";
import {
  getGridFilterOptions,
  getTransactionsForGrid,
  type GridDateType,
  type GridFilters,
  type GridTransaction,
} from "@/app/actions/power-grid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportPowerGridToCSV, type ExportableTransaction } from "@/lib/utils/export";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Database,
  Download,
  Filter,
  Loader2,
  Minimize2,
  Save,
  Search,
  TableProperties,
  X,
} from "lucide-react";
import { orderByMostUsedCategory } from "@/lib/category-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExcelGrid, type PendingChange } from "./excel-grid";

type FilterOptions = Awaited<ReturnType<typeof getGridFilterOptions>>;

interface PowerGridClientPageProps {
  filterOptions: FilterOptions;
}

function generateInvoiceOptions(baseDateStr?: string): { value: string; label: string }[] {
  const baseDate = baseDateStr ? parseISO(baseDateStr) : new Date();

  const options = [];
  for (let i = -6; i <= 12; i++) {
    const d = addMonths(baseDate, i);
    const value = format(d, "yyyy-MM");
    const label = format(d, "MMMM/yyyy", { locale: ptBR });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

export function PowerGridClientPage({ filterOptions }: PowerGridClientPageProps) {
  // ─── Filter state ──────────────────────────────────────
  const [dateType, setDateType] = useState<GridDateType>("dueDate");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");

  // ─── Data state ────────────────────────────────────────
  const [data, setData] = useState<GridTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ─── Edit state ────────────────────────────────────────
  const [pendingChanges, setPendingChanges] = useState<Record<number, PendingChange>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    batchId: string;
    updatedCount: number;
    deletedCount: number;
    balanceAdjustments: Array<{ accountId: number; delta: number }>;
  } | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true);
  }, []);
  const invoiceOptions = isMounted ? generateInvoiceOptions() : [];

  const orderedCategories = useMemo(
    () => orderByMostUsedCategory(filterOptions.categories, data),
    [filterOptions.categories, data],
  );

  const activeFilterCount = [
    dateStart,
    dateEnd,
    amountMin,
    amountMax,
    categoryId && categoryId !== "all" ? categoryId : null,
    status && status !== "all" ? status : null,
    creditCardId && creditCardId !== "all" ? creditCardId : null,
    invoiceMonth && invoiceMonth !== "all" ? invoiceMonth : null,
  ].filter(Boolean).length;

  const handleLoad = useCallback(async () => {
    setLoading(true);
    try {
      const filters: GridFilters = {
        dateType,
      };

      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;
      if (amountMin) filters.amountMin = Number(amountMin);
      if (amountMax) filters.amountMax = Number(amountMax);
      if (categoryId && categoryId !== "all") filters.categoryId = Number(categoryId);
      if (status === "paid" || status === "pending") filters.status = status;
      if (creditCardId && creditCardId !== "all") filters.creditCardId = Number(creditCardId);
      if (invoiceMonth && invoiceMonth !== "all") filters.invoiceMonth = invoiceMonth;

      const result = await getTransactionsForGrid(filters);
      setData(result);
      setHasLoaded(true);
      setPendingChanges({}); // Clear any pending changes on reload
    } catch (error) {
      console.error("Error loading grid data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateType, dateStart, dateEnd, amountMin, amountMax, categoryId, status, creditCardId, invoiceMonth]);

  const handleClearFilters = useCallback(() => {
    setDateType("dueDate");
    setDateStart("");
    setDateEnd("");
    setAmountMin("");
    setAmountMax("");
    setCategoryId("");
    setStatus("");
    setCreditCardId("");
    setInvoiceMonth("");
  }, []);

  // ─── Change Handlers ───────────────────────────────────

  const handleFieldChange = (id: number, field: keyof GridTransaction, value: string | number | null) => {
    setPendingChanges((prev) => {
      const current = prev[id] || { type: "edit", changes: {} };
      if (current.type === "delete") return prev; // Do not edit if deleted

      const newChanges = { ...current.changes, [field]: value };
      return { ...prev, [id]: { type: "edit", changes: newChanges } };
    });
  };

  const handleToggleDelete = (id: number) => {
    setPendingChanges((prev) => {
      const current = prev[id];
      if (current?.type === "delete") {
        // Undo delete: revert to edit if it had changes, or remove it
        const newPrev = { ...prev };
        if (current.changes && Object.keys(current.changes).length > 0) {
          newPrev[id] = { type: "edit", changes: current.changes };
        } else {
          delete newPrev[id];
        }
        return newPrev;
      } else {
        // Mark as delete
        return { ...prev, [id]: { type: "delete", changes: current?.changes } };
      }
    });
  };

  const handleSaveBatch = async () => {
    setIsSaving(true);
    try {
      const updates = [];
      const deletes = [];

      for (const [idStr, pending] of Object.entries(pendingChanges)) {
        const id = Number(idStr);
        const original = data.find((t) => t.id === id);
        if (!original) continue;

        if (pending.type === "delete") {
          deletes.push({ id, original: original as NonNullable<GridTransaction> });
        } else if (pending.type === "edit" && pending.changes) {
          // Prepare changes for the database schema (e.g. amount string, numbers, dates)
          const formattedChanges: Record<string, string | number | null | undefined> = {};

          if (pending.changes.dueDate) formattedChanges.dueDate = pending.changes.dueDate;
          if (pending.changes.launchDate) formattedChanges.launchDate = pending.changes.launchDate;
          if (pending.changes.description) formattedChanges.description = pending.changes.description;
          if (pending.changes.amount !== undefined) {
            formattedChanges.amount = String(pending.changes.amount);
          }
          if (pending.changes.categoryId) formattedChanges.categoryId = pending.changes.categoryId;
          if (pending.changes.subcategoryId !== undefined)
            formattedChanges.subcategoryId = pending.changes.subcategoryId;
          if (pending.changes.invoiceMonth !== undefined) formattedChanges.invoiceMonth = pending.changes.invoiceMonth;
          if (pending.changes.status) formattedChanges.status = pending.changes.status;

          // Only add if there's actually a change to send
          if (Object.keys(formattedChanges).length > 0) {
            updates.push({ id, changes: formattedChanges, original: original as NonNullable<GridTransaction> });
          }
        }
      }

      const result = await processBatchUpdates(updates, deletes);
      if (result.success) {
        setBatchResult(result.summary || null);
      } else {
        alert("Erro ao salvar: " + result.error);
      }
    } catch (error) {
      console.error("Batch save error:", error);
      alert("Erro inesperado ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    if (data.length === 0) return;

    const exportRows: ExportableTransaction[] = [];
    for (const tx of data) {
      const pending = pendingChanges[tx.id];
      if (pending?.type === "delete") continue;

      const changes = pending?.changes;
      const effectiveCategoryId = changes?.categoryId ?? tx.categoryId;
      const effectiveSubcategoryId =
        changes?.subcategoryId !== undefined ? changes.subcategoryId : tx.subcategoryId;

      const catObj = filterOptions.categories.find((c) => c.id === effectiveCategoryId);
      const subcatObj = catObj?.subcategories.find((s) => s.id === effectiveSubcategoryId);

      exportRows.push({
        dueDate: changes?.dueDate ?? tx.dueDate,
        launchDate: tx.launchDate,
        description: changes?.description ?? tx.description,
        amount: changes?.amount ?? tx.amount,
        type: tx.type,
        status: changes?.status ?? tx.status,
        invoiceMonth: changes?.invoiceMonth !== undefined ? changes.invoiceMonth : tx.invoiceMonth,
        category: catObj ? { name: catObj.name } : tx.category,
        subcategory:
          effectiveSubcategoryId === null ? null : subcatObj ? { name: subcatObj.name } : tx.subcategory,
        account: tx.account,
        creditCard: tx.creditCard,
      });
    }

    exportPowerGridToCSV(exportRows);
  }, [data, pendingChanges, filterOptions.categories]);

  const handleCloseModal = () => {
    setBatchResult(null);
    handleLoad(); // Reload the grid to fetch fresh data
  };

  const pendingCount = Object.keys(pendingChanges).length;

  return (
    <div className="space-y-6 pb-24">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TableProperties className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Power Grid</h1>
            <p className="text-sm text-muted-foreground">Edição em lote de transações</p>
          </div>
        </div>

        {hasLoaded && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{data.length}</span>{" "}
                {data.length === 1 ? "transação" : "transações"}
              </span>
            </div>
            {data.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Filters Panel ──────────────────────────────── */}
      <Accordion type="single" collapsible defaultValue="filters">
        <AccordionItem value="filters" className="rounded-xl border border-border bg-card/50 backdrop-blur-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-semibold">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* ── Date Type ────────────────────────── */}
              <div className="space-y-1.5">
                <Label htmlFor="power-grid-date-type" className="text-xs font-medium text-muted-foreground">
                  Tipo de Data
                </Label>
                <Select value={dateType} onValueChange={(v) => setDateType(v as GridDateType)}>
                  <SelectTrigger id="power-grid-date-type" className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Vencimento</SelectItem>
                    <SelectItem value="launchDate">Lançamento</SelectItem>
                    <SelectItem value="paidAt">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Date Range ───────────────────────── */}
              <div className="space-y-1.5">
                <Label htmlFor="power-grid-date-start" className="text-xs font-medium text-muted-foreground">
                  Data Início
                </Label>
                <Input
                  id="power-grid-date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="power-grid-date-end" className="text-xs font-medium text-muted-foreground">
                  Data Fim
                </Label>
                <Input
                  id="power-grid-date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* ── Amount Range ─────────────────────── */}
              <div className="space-y-1.5">
                <Label htmlFor="power-grid-amount-min" className="text-xs font-medium text-muted-foreground">
                  Valor Mínimo
                </Label>
                <Input
                  id="power-grid-amount-min"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="power-grid-amount-max" className="text-xs font-medium text-muted-foreground">
                  Valor Máximo
                </Label>
                <Input
                  id="power-grid-amount-max"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="99.999,99"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* ── Category ─────────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="power-grid-category" className="w-full bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {orderedCategories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Status ───────────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="power-grid-status" className="w-full bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Credit Card ──────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Cartão de Crédito</Label>
                <Select value={creditCardId} onValueChange={setCreditCardId}>
                  <SelectTrigger id="power-grid-credit-card" className="w-full bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.creditCards.map((card) => (
                      <SelectItem key={card.id} value={String(card.id)}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Invoice Month ────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Mês da Fatura</Label>
                <Select value={invoiceMonth} onValueChange={setInvoiceMonth}>
                  <SelectTrigger id="power-grid-invoice-month" className="w-full bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Faturas</SelectItem>
                    {invoiceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Actions ──────────────────────────────── */}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-1.5 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Limpar filtros
                </Button>
              )}
              <Button onClick={handleLoad} isLoading={loading} disabled={loading} className="gap-2">
                <Search className="h-4 w-4" />
                Carregar Dados
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ─── Table Area ─────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/30">
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando transações...</p>
          </div>
        ) : !hasLoaded ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <TableProperties className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-medium text-muted-foreground">Nenhum dado carregado</p>
              <p className="max-w-sm text-sm text-muted-foreground/70">
                Selecione os filtros desejados e clique em{" "}
                <span className="font-medium text-foreground">&quot;Carregar Dados&quot;</span> para exibir as
                transações na grade.
              </p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-medium text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="max-w-sm text-sm text-muted-foreground/70">Ajuste os filtros e tente novamente.</p>
            </div>
          </div>
        ) : !isFullscreen ? (
          <ExcelGrid
            data={data}
            pendingChanges={pendingChanges}
            orderedCategories={orderedCategories}
            allCategories={filterOptions.categories}
            invoiceOptions={invoiceOptions}
            onToggleFullscreen={() => setIsFullscreen(true)}
            onFieldChange={handleFieldChange}
            onToggleDelete={handleToggleDelete}
          />
        ) : null}
      </div>

      {/* ─── Fullscreen Grid Portal (escapes SidebarLayout z-10 stacking context) ── */}
      {isMounted &&
        isFullscreen &&
        hasLoaded &&
        data.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[45] flex flex-col bg-background">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <TableProperties className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Power Grid</span>
                </div>
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{data.length}</span>{" "}
                  {data.length === 1 ? "transação" : "transações"}
                </span>
                {pendingCount > 0 && (
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {pendingCount} {pendingCount === 1 ? "alteração pendente" : "alterações pendentes"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pendingCount > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingChanges({})}
                      disabled={isSaving}
                    >
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveBatch}
                      isLoading={isSaving}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar Tudo
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsFullscreen(false)} className="gap-1.5">
                  <Minimize2 className="h-3.5 w-3.5" />
                  Sair da tela cheia
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ExcelGrid
                data={data}
                pendingChanges={pendingChanges}
                orderedCategories={orderedCategories}
                allCategories={filterOptions.categories}
                invoiceOptions={invoiceOptions}
                isFullscreen={true}
                onFieldChange={handleFieldChange}
                onToggleDelete={handleToggleDelete}
              />
            </div>
          </div>,
          document.body,
        )}

      {/* ─── Save Footer Bar ────────────────────────────── */}
      {pendingCount > 0 && !isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-6 duration-300 md:left-[--sidebar-width]">
          <div className="flex items-center justify-between border-t border-border bg-card/80 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Save className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  {pendingCount} {pendingCount === 1 ? "alteração pendente" : "alterações pendentes"}
                </p>
                <p className="text-xs text-muted-foreground">As modificações só serão aplicadas ao salvar.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPendingChanges({})} disabled={isSaving}>
                Descartar
              </Button>
              <Button onClick={handleSaveBatch} isLoading={isSaving} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Tudo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Batch Result Modal ─────────────────────────── */}
      <Dialog open={!!batchResult} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Lote processado com sucesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
                <span className="text-3xl font-bold text-primary">{batchResult?.updatedCount || 0}</span>
                <span className="text-xs text-muted-foreground">Atualizadas</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
                <span className="text-3xl font-bold text-destructive">{batchResult?.deletedCount || 0}</span>
                <span className="text-xs text-muted-foreground">Excluídas</span>
              </div>
            </div>

            {batchResult?.balanceAdjustments && batchResult.balanceAdjustments.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ajustes de Saldo</p>
                <div className="space-y-1">
                  {batchResult.balanceAdjustments.map((adj: { accountId: number; delta: number }) => (
                    <div key={adj.accountId} className="flex justify-between text-sm">
                      <span>Conta ID: {adj.accountId}</span>
                      <span className={adj.delta >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {adj.delta >= 0 ? "+" : ""}
                        {adj.delta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              ID do Lote: <code className="rounded bg-muted px-1 py-0.5">{batchResult?.batchId}</code>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseModal} className="w-full">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
