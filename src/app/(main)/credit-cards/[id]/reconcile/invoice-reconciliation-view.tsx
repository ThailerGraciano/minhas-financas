"use client";

import {
  analyzeInvoiceReconciliation,
  applyInvoiceReconciliation,
  MatchedReconciliationItem,
  ToAddReconciliationItem,
  ToRemoveReconciliationItem,
} from "@/app/actions/invoice-reconciliation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Link2Off,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export interface ReconciliationCategoryOption {
  id: number;
  name: string;
  type?: string;
  subcategories?: {
    id: number;
    name: string;
    categoryId: number;
  }[];
}

interface EditableAddRow extends ToAddReconciliationItem {
  selected: boolean;
}

interface EditableRemoveRow extends ToRemoveReconciliationItem {
  selected: boolean;
}

interface InvoiceReconciliationViewProps {
  creditCardId: number;
  competencyMonth: string;
  currentTotal: number;
  isInvoicePaid: boolean;
  categories: ReconciliationCategoryOption[];
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo PDF."));
    reader.readAsDataURL(file);
  });
}

export function InvoiceReconciliationView({
  creditCardId,
  competencyMonth,
  currentTotal,
  isInvoicePaid,
  categories,
}: InvoiceReconciliationViewProps) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "analyzing" | "review">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [bankTotal, setBankTotal] = useState<number>(0);
  const [appTotal, setAppTotal] = useState<number>(currentTotal);
  const [addRows, setAddRows] = useState<EditableAddRow[]>([]);
  const [removeRows, setRemoveRows] = useState<EditableRemoveRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedReconciliationItem[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<"pending" | "paid">(isInvoicePaid ? "paid" : "pending");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.type || c.type === "expense"),
    [categories],
  );

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isCsv =
      file.type === "text/csv" || lowerName.endsWith(".csv") || file.type === "application/vnd.ms-excel";

    if (!isPdf && !isCsv) {
      const msg = "Formato inválido. Selecione um arquivo .CSV ou .PDF.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = "O arquivo excede o limite máximo de 10 MB.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      const msg = "Selecione um arquivo CSV ou PDF da fatura.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setErrorMessage(null);
    setStep("analyzing");
    try {
      const isPdf =
        selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

      const filePayload = isPdf
        ? { fileType: "pdf" as const, base64: await readFileAsBase64(selectedFile) }
        : { fileType: "csv" as const, text: await selectedFile.text() };

      const response = await analyzeInvoiceReconciliation({
        creditCardId,
        competencyMonth,
        file: filePayload,
      });

      if (!response.success) {
        setErrorMessage(response.error);
        toast.error(response.error);
        setStep("upload");
        return;
      }

      setBankTotal(response.data.invoiceTotal);
      setAppTotal(response.data.appTotal);
      setAddRows(response.data.toAdd.map((item) => ({ ...item, selected: true })));
      setRemoveRows(response.data.toRemove.map((item) => ({ ...item, selected: true })));
      setMatchedRows(response.data.matched);
      setStep("review");
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof Error && error.message
          ? `Erro ao processar o arquivo: ${error.message}`
          : "Erro inesperado ao processar o arquivo.";
      setErrorMessage(msg);
      toast.error(msg);
      setStep("upload");
    }
  };

  const selectedAddTotal = useMemo(
    () => addRows.filter((r) => r.selected).reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [addRows],
  );

  const selectedRemoveTotal = useMemo(
    () => removeRows.filter((r) => r.selected).reduce((acc, r) => acc + Number(r.appAmount || 0), 0),
    [removeRows],
  );

  const projectedAppTotal = useMemo(
    () => appTotal + selectedAddTotal - selectedRemoveTotal,
    [appTotal, selectedAddTotal, selectedRemoveTotal],
  );

  const remainingDiff = useMemo(() => bankTotal - projectedAppTotal, [bankTotal, projectedAppTotal]);
  const isBalanced = Math.abs(remainingDiff) < 0.01;

  const selectedAddCount = useMemo(() => addRows.filter((r) => r.selected).length, [addRows]);
  const selectedRemoveCount = useMemo(() => removeRows.filter((r) => r.selected).length, [removeRows]);

  const handleUpdateAddRow = <K extends keyof EditableAddRow>(
    tempId: string,
    field: K,
    value: EditableAddRow[K],
  ) => {
    setAddRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const updated = { ...row, [field]: value };
        if (field === "suggestedCategoryId") {
          updated.suggestedSubcategoryId = null;
        }
        return updated;
      }),
    );
  };

  const handleAddManualRow = () => {
    const firstCat = expenseCategories[0];
    setAddRows((prev) => [
      ...prev,
      {
        tempId: `manual-${Date.now()}`,
        description: "Novo lançamento",
        amount: Math.abs(remainingDiff) >= 0.01 ? Number(Math.abs(remainingDiff).toFixed(2)) : 0,
        date: `${competencyMonth}-01`,
        suggestedCategoryId: firstCat?.id ?? null,
        suggestedSubcategoryId: firstCat?.subcategories?.[0]?.id ?? null,
        installmentCurrent: null,
        installmentTotal: null,
        reason: "Adicionado manualmente na conciliação",
        selected: true,
      },
    ]);
  };

  const handleDeleteAddRow = (tempId: string) => {
    setAddRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleUnlinkMatched = (item: MatchedReconciliationItem) => {
    setMatchedRows((prev) => prev.filter((m) => m.appTransactionId !== item.appTransactionId));
    setAddRows((prev) => [
      {
        tempId: `unlinked-${item.appTransactionId}-${Date.now()}`,
        description: item.bankDescription,
        amount: item.bankAmount,
        date: item.bankDate,
        suggestedCategoryId: expenseCategories[0]?.id ?? null,
        suggestedSubcategoryId: null,
        installmentCurrent: null,
        installmentTotal: null,
        reason: "Desvinculado manualmente pelo usuário",
        selected: true,
      },
      ...prev,
    ]);
    setRemoveRows((prev) => [
      {
        appTransactionId: item.appTransactionId,
        appDescription: item.appDescription,
        appAmount: item.appAmount,
        appDate: item.appDate,
        categoryName: null,
        installmentInfo: null,
        reason: "Desvinculado manualmente pelo usuário",
        selected: true,
      },
      ...prev,
    ]);
  };

  const handleApply = async () => {
    const selectedAdditions = addRows.filter((r) => r.selected);
    const selectedRemovals = removeRows.filter((r) => r.selected);

    if (selectedAdditions.length === 0 && selectedRemovals.length === 0) {
      toast.error("Selecione ao menos uma adição ou remoção para aplicar.");
      return;
    }

    for (const item of selectedAdditions) {
      if (!item.description.trim()) {
        toast.error("Preencha a descrição de todos os itens selecionados para adição.");
        return;
      }
      if (Math.abs(item.amount) < 0.01) {
        toast.error(`Informe um valor válido para "${item.description}".`);
        return;
      }
    }

    setIsApplying(true);
    const res = await applyInvoiceReconciliation({
      creditCardId,
      competencyMonth,
      defaultStatus,
      additions: selectedAdditions.map((a) => ({
        description: a.description.trim(),
        amount: Number(a.amount),
        date: a.date,
        categoryId: a.suggestedCategoryId,
        subcategoryId: a.suggestedSubcategoryId,
        installmentCurrent: a.installmentCurrent,
        installmentTotal: a.installmentTotal,
      })),
      removalIds: selectedRemovals.map((r) => r.appTransactionId),
    });
    setIsApplying(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success(
      `Conciliação aplicada: ${res.addedCount} adicionada(s) e ${res.removedCount} removida(s).`,
    );
    router.push(`/credit-cards/${creditCardId}?month=${competencyMonth}`);
    router.refresh();
  };

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Importar Fatura (CSV ou PDF)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/15 hover:border-purple-400/60 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf,application/pdf,text/csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <UploadCloud className="w-12 h-12 mx-auto mb-3 text-purple-400" />
            <p className="font-medium text-base">Arraste sua fatura aqui ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Suporta arquivos <strong>.PDF</strong> ou <strong>.CSV</strong> de qualquer banco (máx. 10 MB)
            </p>

            {selectedFile && (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-sm">
                {selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                  <FileText className="w-4 h-4 text-purple-400" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-medium truncate max-w-[320px]">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Total atual cadastrado nesta fatura no app: <strong>{formatCurrency(currentTotal)}</strong>
            </p>
            <Button onClick={handleAnalyze} disabled={!selectedFile} size="lg" className="w-full sm:w-auto gap-2">
              <FileUp className="w-4 h-4" />
              Analisar Fatura com IA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "analyzing") {
    return (
      <Card>
        <CardContent className="py-24 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
          <div>
            <p className="text-lg font-semibold">Analisando fatura com IA...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Extraindo lançamentos e cruzando por valor e descrição com as despesas do app.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Resumo Matemático em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Total na Fatura (Banco)</Label>
            <CurrencyInput
              name="bankTotal"
              value={bankTotal}
              onValueChange={setBankTotal}
              className="h-9 text-base font-bold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground">Total Atual no App</p>
            <p className="text-xl font-bold pt-1">{formatCurrency(appTotal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground">Total Pós-Conciliação</p>
            <p className="text-xl font-bold pt-0.5">{formatCurrency(projectedAppTotal)}</p>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(selectedAddTotal)} / -{formatCurrency(selectedRemoveTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className={isBalanced ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Diferença Restante</p>
            <div>
              {isBalanced ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1.5 text-sm py-1 px-2.5">
                  <CheckCircle2 className="w-4 h-4" />
                  R$ 0,00 — Batendo!
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1.5 text-sm py-1 px-2.5">
                  <AlertTriangle className="w-4 h-4" />
                  {remainingDiff > 0 ? `+${formatCurrency(remainingDiff)}` : formatCurrency(remainingDiff)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas do Grid */}
      <Tabs defaultValue="adjustments" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="adjustments">
            Sugestões de Ajuste ({addRows.length + removeRows.length})
          </TabsTrigger>
          <TabsTrigger value="matched">Conciliados pela IA ({matchedRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments" className="space-y-6">
          {/* Faltam no App (Adições) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base text-emerald-400">
                Faltam no App — Sugestões de Adição ({addRows.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddManualRow} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Adicionar linha
              </Button>
            </CardHeader>
            <CardContent>
              {addRows.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center">
                  Nenhuma despesa faltando no app.
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="min-w-[240px]">Descrição</TableHead>
                        <TableHead className="w-[155px]">Data</TableHead>
                        <TableHead className="w-[150px]">Valor (R$)</TableHead>
                        <TableHead className="min-w-[180px]">Categoria</TableHead>
                        <TableHead className="min-w-[170px]">Subcategoria</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addRows.map((row) => {
                        const selectedCat = expenseCategories.find((c) => c.id === row.suggestedCategoryId);
                        const subs = selectedCat?.subcategories ?? [];
                        return (
                          <TableRow key={row.tempId} className={!row.selected ? "opacity-50" : undefined}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) => handleUpdateAddRow(row.tempId, "selected", e.target.checked)}
                                className="h-4 w-4 accent-purple-500 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell className="space-y-1">
                              <Input
                                value={row.description}
                                onChange={(e) => handleUpdateAddRow(row.tempId, "description", e.target.value)}
                                className="h-9 text-sm"
                              />
                              <p className="text-xs text-muted-foreground" title={row.reason}>
                                {row.reason}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={row.date}
                                onChange={(e) => handleUpdateAddRow(row.tempId, "date", e.target.value)}
                                className="h-9 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                name={`amount-${row.tempId}`}
                                value={row.amount}
                                onValueChange={(val) => handleUpdateAddRow(row.tempId, "amount", val)}
                                className="h-9 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.suggestedCategoryId ? String(row.suggestedCategoryId) : "none"}
                                onValueChange={(val) =>
                                  handleUpdateAddRow(
                                    row.tempId,
                                    "suggestedCategoryId",
                                    val === "none" ? null : Number(val),
                                  )
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Outros (Padrão)</SelectItem>
                                  {expenseCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.suggestedSubcategoryId ? String(row.suggestedSubcategoryId) : "none"}
                                onValueChange={(val) =>
                                  handleUpdateAddRow(
                                    row.tempId,
                                    "suggestedSubcategoryId",
                                    val === "none" ? null : Number(val),
                                  )
                                }
                                disabled={subs.length === 0}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Subcategoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Geral</SelectItem>
                                  {subs.map((sub) => (
                                    <SelectItem key={sub.id} value={String(sub.id)}>
                                      {sub.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                onClick={() => handleDeleteAddRow(row.tempId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sobrando no App (Remoções) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-rose-400">
                Sobrando no App — Sugestões de Remoção ({removeRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {removeRows.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center">
                  Nenhuma despesa extra identificada no app.
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="min-w-[220px]">Descrição no App</TableHead>
                        <TableHead className="w-[120px]">Data</TableHead>
                        <TableHead className="w-[130px]">Valor</TableHead>
                        <TableHead className="min-w-[240px]">Motivo (IA)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {removeRows.map((row) => (
                        <TableRow key={row.appTransactionId} className={!row.selected ? "opacity-50" : undefined}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) =>
                                setRemoveRows((prev) =>
                                  prev.map((r) =>
                                    r.appTransactionId === row.appTransactionId
                                      ? { ...r, selected: e.target.checked }
                                      : r,
                                  ),
                                )
                              }
                              className="h-4 w-4 accent-rose-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span>{row.appDescription}</span>
                              {row.installmentInfo && (
                                <Badge variant="outline" className="text-xs">
                                  Parc. {row.installmentInfo}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.appDate}</TableCell>
                          <TableCell className="text-sm font-semibold text-rose-400">
                            {formatCurrency(row.appAmount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matched">
          <Card>
            <CardContent className="pt-6">
              {matchedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground p-8 border border-dashed rounded-lg text-center">
                  Nenhum lançamento conciliado automaticamente.
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lançamento no Banco</TableHead>
                        <TableHead>Lançamento no App</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Confiança e Motivo</TableHead>
                        <TableHead className="w-[130px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchedRows.map((item) => (
                        <TableRow key={item.appTransactionId}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{item.bankDescription}</div>
                            <div className="text-xs text-muted-foreground">{item.bankDate}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{item.appDescription}</div>
                            <div className="text-xs text-muted-foreground">{item.appDate}</div>
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {formatCurrency(item.bankAmount)}
                            {Math.abs(item.bankAmount - item.appAmount) >= 0.01 && (
                              <div className="text-xs text-amber-400">App: {formatCurrency(item.appAmount)}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm space-y-1">
                            <Badge
                              variant="outline"
                              className={
                                item.confidence === "high"
                                  ? "border-emerald-500/40 text-emerald-400"
                                  : item.confidence === "medium"
                                    ? "border-amber-500/40 text-amber-300"
                                    : "border-rose-500/40 text-rose-400"
                              }
                            >
                              {item.confidence === "high"
                                ? "Alta"
                                : item.confidence === "medium"
                                  ? "Média"
                                  : "Baixa"}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-muted-foreground hover:text-amber-400"
                              onClick={() => handleUnlinkMatched(item)}
                            >
                              <Link2Off className="w-4 h-4" />
                              Desvincular
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barra de Ação */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Label className="text-muted-foreground whitespace-nowrap">Status das novas despesas:</Label>
            <Select
              value={defaultStatus}
              onValueChange={(val) => setDefaultStatus(val === "paid" ? "paid" : "pending")}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={() => setStep("upload")} disabled={isApplying}>
              Trocar Arquivo
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || (selectedAddCount === 0 && selectedRemoveCount === 0)}
              className="gap-2"
            >
              {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
              Aplicar Conciliação ({selectedAddCount} + / {selectedRemoveCount} -)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
