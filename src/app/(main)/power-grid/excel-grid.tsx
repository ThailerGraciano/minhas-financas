"use client";

import type { GridTransaction } from "@/app/actions/power-grid";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  ChevronDown,
  CreditCard,
  Maximize2,
  Trash2,
  Undo2,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PendingChange = {
  type: "edit" | "delete";
  changes?: Partial<GridTransaction>;
};

export interface CategoryOption {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  subcategories: { id: number; name: string }[];
}

export interface InvoiceOption {
  value: string;
  label: string;
}

interface ExcelGridProps {
  data: GridTransaction[];
  pendingChanges: Record<number, PendingChange>;
  orderedCategories: CategoryOption[];
  allCategories: CategoryOption[];
  invoiceOptions: InvoiceOption[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onFieldChange: (id: number, field: keyof GridTransaction, value: string | number | null) => void;
  onToggleDelete: (id: number) => void;
}

type CellCoord = { row: number; col: number };

const COL_COUNT = 9;
const COL_TIPO = 0;
const COL_DESC = 1;
const COL_AMOUNT = 2;
const COL_DATE = 3;
const COL_CAT = 4;
const COL_SUBCAT = 5;
const COL_INVOICE = 6;
const COL_STATUS = 7;
const COL_ACTIONS = 8;

const TYPE_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  income: {
    label: "Receita",
    className: "text-emerald-400",
    icon: <ArrowUpCircle className="h-3.5 w-3.5 shrink-0" />,
  },
  expense: {
    label: "Despesa",
    className: "text-red-400",
    icon: <ArrowDownCircle className="h-3.5 w-3.5 shrink-0" />,
  },
  transfer: {
    label: "Transf.",
    className: "text-blue-400",
    icon: <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />,
  },
  credit_card_expense: {
    label: "Cartão",
    className: "text-orange-400",
    icon: <CreditCard className="h-3.5 w-3.5 shrink-0" />,
  },
};

function formatCurrencyDisplay(amount: string | number): string {
  const num = Number(amount || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

const CELL_FOCUS_CLASS =
  "focus:ring-2 focus:ring-inset focus:ring-primary focus:bg-primary/5 focus:z-10 focus:relative";

interface ExcelGridRowProps {
  tx: GridTransaction;
  rowIdx: number;
  pending: PendingChange | undefined;
  editingCol: number | null;
  draftValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  categoryMap: Map<number, CategoryOption>;
  invoiceLabelMap: Map<string, string>;
  orderedCategories: CategoryOption[];
  invoiceOptions: InvoiceOption[];
  setCellRef: (row: number, col: number, el: HTMLDivElement | null) => void;
  onCellClick: (row: number, col: number, isSelectOrAction?: boolean) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onCellKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, row: number, col: number) => void;
  onDraftChange: (value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => void;
  onInputBlur: (row: number, col: number) => void;
  onFieldChange: (id: number, field: keyof GridTransaction, value: string | number | null) => void;
  onToggleDelete: (id: number) => void;
  onCloseSelect: (row: number, col: number) => void;
}

const ExcelGridRow = memo(function ExcelGridRow({
  tx,
  rowIdx,
  pending,
  editingCol,
  draftValue,
  inputRef,
  categoryMap,
  invoiceLabelMap,
  orderedCategories,
  invoiceOptions,
  setCellRef,
  onCellClick,
  onCellDoubleClick,
  onCellKeyDown,
  onDraftChange,
  onInputKeyDown,
  onInputBlur,
  onFieldChange,
  onToggleDelete,
  onCloseSelect,
}: ExcelGridRowProps) {
  const typeInfo = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.expense;
  const isDeleted = pending?.type === "delete";
  const isEditedRow = pending?.type === "edit";

  const currentDesc = pending?.changes?.description ?? tx.description;
  const currentAmount = pending?.changes?.amount ?? tx.amount;
  const currentDueDate = pending?.changes?.dueDate ?? tx.dueDate;
  const currentCategoryId = pending?.changes?.categoryId ?? tx.categoryId;
  const currentCategory = currentCategoryId ? String(currentCategoryId) : "";
  const currentSubcategory =
    pending?.changes?.subcategoryId !== undefined
      ? pending.changes.subcategoryId === null
        ? "none"
        : String(pending.changes.subcategoryId)
      : tx.subcategoryId
        ? String(tx.subcategoryId)
        : "none";
  const currentInvoiceMonth =
    pending?.changes?.invoiceMonth !== undefined
      ? pending.changes.invoiceMonth === null
        ? "none"
        : pending.changes.invoiceMonth
      : tx.invoiceMonth
        ? tx.invoiceMonth
        : "none";
  const currentStatus = pending?.changes?.status ?? tx.status;

  const selectedCat = currentCategoryId ? categoryMap.get(currentCategoryId) : undefined;
  const subcategories = selectedCat?.subcategories ?? [];
  const selectedSubcatName =
    currentSubcategory === "none"
      ? "Geral"
      : subcategories.find((s) => String(s.id) === currentSubcategory)?.name ?? "Geral";

  const changedCellClass = (field: keyof GridTransaction) => {
    const isChanged =
      pending?.type === "edit" &&
      pending.changes?.[field] !== undefined &&
      pending.changes[field] !== tx[field];
    return isChanged ? "bg-green-500/20 text-green-700 dark:text-green-400 font-medium" : "";
  };

  const isEditing = (col: number) => editingCol === col;

  return (
    <tr
      className={cn(
        "h-9",
        isDeleted
          ? "bg-destructive/10 opacity-60"
          : isEditedRow
            ? "bg-green-500/[0.03] hover:bg-muted/40"
            : "hover:bg-muted/30",
      )}
    >
      {/* Row Header (#) */}
      <td className="border-b border-r border-border/60 bg-muted/30 px-2 text-center font-mono text-[11px] text-muted-foreground">
        {rowIdx + 1}
      </td>

      {/* Col 0: Tipo (Read-only) */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_TIPO, el)}
          tabIndex={rowIdx === 0 ? 0 : -1}
          onClick={() => onCellClick(rowIdx, COL_TIPO)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_TIPO)}
          className={cn(
            "flex h-9 w-full items-center gap-1.5 px-2.5 outline-none",
            typeInfo.className,
            CELL_FOCUS_CLASS,
          )}
        >
          {typeInfo.icon}
          <span className="truncate text-xs font-medium">{typeInfo.label}</span>
        </div>
      </td>

      {/* Col 1: Descrição */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_DESC, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_DESC)}
          onDoubleClick={() => onCellDoubleClick(rowIdx, COL_DESC)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_DESC)}
          className={cn(
            "flex h-9 w-full items-center px-2.5 outline-none",
            changedCellClass("description"),
            isDeleted && "line-through",
            CELL_FOCUS_CLASS,
            isEditing(COL_DESC) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_DESC) ? (
            <input
              ref={inputRef}
              type="text"
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => onInputKeyDown(e, rowIdx, COL_DESC)}
              onBlur={() => onInputBlur(rowIdx, COL_DESC)}
              className="h-full w-full bg-background px-2.5 text-xs sm:text-sm font-medium outline-none"
            />
          ) : (
            <span className="truncate w-full">{currentDesc}</span>
          )}
        </div>
      </td>

      {/* Col 2: Valor */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_AMOUNT, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_AMOUNT)}
          onDoubleClick={() => onCellDoubleClick(rowIdx, COL_AMOUNT)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_AMOUNT)}
          className={cn(
            "flex h-9 w-full items-center justify-end px-2.5 font-mono font-semibold outline-none",
            tx.type === "income" ? "text-emerald-500" : "text-red-500",
            changedCellClass("amount"),
            isDeleted && "line-through",
            CELL_FOCUS_CLASS,
            isEditing(COL_AMOUNT) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_AMOUNT) ? (
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => onInputKeyDown(e, rowIdx, COL_AMOUNT)}
              onBlur={() => onInputBlur(rowIdx, COL_AMOUNT)}
              className="h-full w-full bg-background px-2.5 text-right font-mono text-xs sm:text-sm font-semibold outline-none"
            />
          ) : (
            <span className="truncate">{formatCurrencyDisplay(currentAmount)}</span>
          )}
        </div>
      </td>

      {/* Col 3: Vencimento */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_DATE, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_DATE)}
          onDoubleClick={() => onCellDoubleClick(rowIdx, COL_DATE)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_DATE)}
          className={cn(
            "flex h-9 w-full items-center px-2.5 font-mono text-xs outline-none",
            changedCellClass("dueDate"),
            isDeleted && "line-through",
            CELL_FOCUS_CLASS,
            isEditing(COL_DATE) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_DATE) ? (
            <input
              ref={inputRef}
              type="date"
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => onInputKeyDown(e, rowIdx, COL_DATE)}
              onBlur={() => onInputBlur(rowIdx, COL_DATE)}
              className="h-full w-full bg-background px-2 font-mono text-xs outline-none"
            />
          ) : (
            <span>{formatDateDisplay(currentDueDate)}</span>
          )}
        </div>
      </td>

      {/* Col 4: Categoria */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_CAT, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_CAT, !isDeleted)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_CAT)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-1 px-2.5 outline-none",
            changedCellClass("categoryId"),
            CELL_FOCUS_CLASS,
            isEditing(COL_CAT) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_CAT) ? (
            <Select
              open={true}
              value={currentCategory}
              onValueChange={(val) => {
                onFieldChange(tx.id, "categoryId", Number(val));
                onFieldChange(tx.id, "subcategoryId", null);
                onCloseSelect(rowIdx, COL_CAT);
              }}
              onOpenChange={(open) => {
                if (!open) onCloseSelect(rowIdx, COL_CAT);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-none border-0 bg-background px-2.5 text-xs sm:text-sm shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderedCategories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <span className="truncate">{selectedCat?.name ?? "—"}</span>
              {!isDeleted && <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />}
            </>
          )}
        </div>
      </td>

      {/* Col 5: Subcategoria */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_SUBCAT, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_SUBCAT, !isDeleted && subcategories.length > 0)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_SUBCAT)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-1 px-2.5 outline-none",
            subcategories.length === 0 && "text-muted-foreground/50",
            changedCellClass("subcategoryId"),
            CELL_FOCUS_CLASS,
            isEditing(COL_SUBCAT) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_SUBCAT) ? (
            <Select
              open={true}
              value={currentSubcategory}
              onValueChange={(val) => {
                onFieldChange(tx.id, "subcategoryId", val === "none" ? null : Number(val));
                onCloseSelect(rowIdx, COL_SUBCAT);
              }}
              onOpenChange={(open) => {
                if (!open) onCloseSelect(rowIdx, COL_SUBCAT);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-none border-0 bg-background px-2.5 text-xs sm:text-sm shadow-none focus:ring-0">
                <SelectValue placeholder="Geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geral</SelectItem>
                {subcategories.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <span className="truncate">{subcategories.length === 0 ? "—" : selectedSubcatName}</span>
              {!isDeleted && subcategories.length > 0 && <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />}
            </>
          )}
        </div>
      </td>

      {/* Col 6: Fatura */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_INVOICE, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_INVOICE, !isDeleted && tx.type === "credit_card_expense")}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_INVOICE)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-1 px-2.5 outline-none",
            tx.type !== "credit_card_expense" && "text-muted-foreground/50",
            changedCellClass("invoiceMonth"),
            CELL_FOCUS_CLASS,
            isEditing(COL_INVOICE) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {tx.type !== "credit_card_expense" ? (
            <span className="text-xs">—</span>
          ) : isEditing(COL_INVOICE) ? (
            <Select
              open={true}
              value={currentInvoiceMonth}
              onValueChange={(val) => {
                onFieldChange(tx.id, "invoiceMonth", val === "none" ? null : val);
                onCloseSelect(rowIdx, COL_INVOICE);
              }}
              onOpenChange={(open) => {
                if (!open) onCloseSelect(rowIdx, COL_INVOICE);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-none border-0 bg-background px-2.5 text-xs sm:text-sm shadow-none focus:ring-0">
                <SelectValue placeholder="Sem Fatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Fatura</SelectItem>
                {invoiceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <span className="truncate">
                {currentInvoiceMonth === "none"
                  ? "Sem Fatura"
                  : invoiceLabelMap.get(currentInvoiceMonth) ?? currentInvoiceMonth}
              </span>
              {!isDeleted && <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />}
            </>
          )}
        </div>
      </td>

      {/* Col 7: Status */}
      <td className="border-b border-r border-border/60 p-0">
        <div
          ref={(el) => setCellRef(rowIdx, COL_STATUS, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_STATUS, !isDeleted)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_STATUS)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-1 px-2.5 outline-none",
            changedCellClass("status"),
            CELL_FOCUS_CLASS,
            isEditing(COL_STATUS) && "p-0 ring-2 ring-inset ring-primary bg-background z-20 relative",
          )}
        >
          {isEditing(COL_STATUS) ? (
            <Select
              open={true}
              value={currentStatus}
              onValueChange={(val) => {
                onFieldChange(tx.id, "status", val);
                onCloseSelect(rowIdx, COL_STATUS);
              }}
              onOpenChange={(open) => {
                if (!open) onCloseSelect(rowIdx, COL_STATUS);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-none border-0 bg-background px-2.5 text-xs sm:text-sm shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
                  currentStatus === "paid"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-amber-500/15 text-amber-500",
                )}
              >
                {currentStatus === "paid" ? "Pago" : "Pendente"}
              </span>
              {!isDeleted && <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />}
            </>
          )}
        </div>
      </td>

      {/* Col 8: Ações */}
      <td className="border-b border-border/60 p-0 text-center">
        <div
          ref={(el) => setCellRef(rowIdx, COL_ACTIONS, el)}
          tabIndex={-1}
          onClick={() => onCellClick(rowIdx, COL_ACTIONS)}
          onKeyDown={(e) => onCellKeyDown(e, rowIdx, COL_ACTIONS)}
          className={cn("flex h-9 w-full items-center justify-center outline-none", CELL_FOCUS_CLASS)}
        >
          <Button
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onCellClick(rowIdx, COL_ACTIONS);
              onToggleDelete(tx.id);
            }}
            className="h-7 w-7 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            title={isDeleted ? "Desfazer exclusão" : "Excluir"}
          >
            {isDeleted ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </td>
    </tr>
  );
});

export function ExcelGrid({
  data,
  pendingChanges,
  orderedCategories,
  allCategories,
  invoiceOptions,
  isFullscreen = false,
  onToggleFullscreen,
  onFieldChange,
  onToggleDelete,
}: ExcelGridProps) {
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [selectAllOnFocus, setSelectAllOnFocus] = useState<boolean>(true);

  const activeCellRef = useRef<CellCoord | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipBlurCommitRef = useRef<boolean>(false);

  const categoryMap = useMemo(() => {
    const map = new Map<number, CategoryOption>();
    for (const cat of allCategories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [allCategories]);

  const invoiceLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of invoiceOptions) {
      map.set(opt.value, opt.label);
    }
    return map;
  }, [invoiceOptions]);

  const setCellRef = useCallback((row: number, col: number, el: HTMLDivElement | null) => {
    const key = `${row}-${col}`;
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  const focusCell = useCallback((row: number, col: number) => {
    const prev = activeCellRef.current;
    if (prev && (prev.row !== row || prev.col !== col)) {
      const prevEl = cellRefs.current.get(`${prev.row}-${prev.col}`);
      if (prevEl) prevEl.tabIndex = -1;
    }
    activeCellRef.current = { row, col };
    const nextEl = cellRefs.current.get(`${row}-${col}`);
    if (nextEl) {
      nextEl.tabIndex = 0;
      nextEl.focus();
    }
  }, []);

  const moveActive = useCallback(
    (targetRow: number, targetCol: number) => {
      if (data.length === 0) return;
      const clampedRow = Math.max(0, Math.min(data.length - 1, targetRow));
      const clampedCol = Math.max(0, Math.min(COL_COUNT - 1, targetCol));
      focusCell(clampedRow, clampedCol);
    },
    [data.length, focusCell],
  );

  const moveNext = useCallback(
    (row: number, col: number, direction: 1 | -1) => {
      if (data.length === 0) return;
      let nextCol = col + direction;
      let nextRow = row;
      if (nextCol >= COL_COUNT) {
        nextCol = 0;
        nextRow = Math.min(data.length - 1, row + 1);
      } else if (nextCol < 0) {
        nextCol = COL_COUNT - 1;
        nextRow = Math.max(0, row - 1);
      }
      moveActive(nextRow, nextCol);
    },
    [data.length, moveActive],
  );

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (selectAllOnFocus) {
        inputRef.current.select();
      } else {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editingCell, selectAllOnFocus]);

  const startEditing = useCallback(
    (row: number, col: number, initialChar?: string) => {
      const tx = data[row];
      if (!tx) return;
      const pending = pendingChanges[tx.id];
      const isDeleted = pending?.type === "delete";
      if (isDeleted && col !== COL_ACTIONS) return;

      if (col === COL_TIPO) return;

      if (col === COL_ACTIONS) {
        onToggleDelete(tx.id);
        return;
      }

      if (col === COL_SUBCAT) {
        const catId = pending?.changes?.categoryId ?? tx.categoryId;
        const cat = catId ? categoryMap.get(catId) : undefined;
        if (!cat || cat.subcategories.length === 0) return;
      }

      if (col === COL_INVOICE && tx.type !== "credit_card_expense") return;

      if (col === COL_DESC) {
        const val = pending?.changes?.description ?? tx.description;
        setDraftValue(initialChar !== undefined ? initialChar : val);
        setSelectAllOnFocus(initialChar === undefined);
        setEditingCell({ row, col });
        return;
      }

      if (col === COL_AMOUNT) {
        const val = pending?.changes?.amount ?? tx.amount;
        const normalizedChar = initialChar === "," ? "." : initialChar;
        setDraftValue(normalizedChar !== undefined ? normalizedChar : String(val));
        setSelectAllOnFocus(initialChar === undefined);
        setEditingCell({ row, col });
        return;
      }

      if (col === COL_DATE) {
        const val = pending?.changes?.dueDate ?? tx.dueDate;
        setDraftValue(val);
        setSelectAllOnFocus(false);
        setEditingCell({ row, col });
        return;
      }

      if (col === COL_CAT || col === COL_SUBCAT || col === COL_INVOICE || col === COL_STATUS) {
        setEditingCell({ row, col });
      }
    },
    [data, pendingChanges, categoryMap, onToggleDelete],
  );

  const commitTextEdit = useCallback(
    (row: number, col: number, value: string) => {
      const tx = data[row];
      if (!tx) return;

      if (col === COL_DESC) {
        onFieldChange(tx.id, "description", value);
      } else if (col === COL_AMOUNT) {
        const normalized = value.replace(",", ".").trim();
        if (normalized !== "" && !Number.isNaN(Number(normalized))) {
          onFieldChange(tx.id, "amount", normalized);
        }
      } else if (col === COL_DATE) {
        if (value) {
          onFieldChange(tx.id, "dueDate", value);
        }
      }
      setEditingCell(null);
    },
    [data, onFieldChange],
  );

  const handleCellClick = useCallback(
    (row: number, col: number, openSelectImmediately?: boolean) => {
      const wasSameCell = activeCellRef.current?.row === row && activeCellRef.current?.col === col;
      focusCell(row, col);
      if (openSelectImmediately || (wasSameCell && (col === COL_DESC || col === COL_AMOUNT || col === COL_DATE))) {
        startEditing(row, col);
      }
    },
    [focusCell, startEditing],
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      focusCell(row, col);
      startEditing(row, col);
    },
    [focusCell, startEditing],
  );

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, row: number, col: number) => {
      if (editingCell && editingCell.row === row && editingCell.col === col) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveActive(row - 1, col);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveActive(row + 1, col);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveActive(row, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveActive(row, col + 1);
          break;
        case "Tab":
          e.preventDefault();
          moveNext(row, col, e.shiftKey ? -1 : 1);
          break;
        case "Home":
          e.preventDefault();
          moveActive(row, 0);
          break;
        case "End":
          e.preventDefault();
          moveActive(row, COL_COUNT - 1);
          break;
        case "Enter":
        case "F2":
          e.preventDefault();
          startEditing(row, col);
          break;
        case " ":
          if (
            col === COL_CAT ||
            col === COL_SUBCAT ||
            col === COL_INVOICE ||
            col === COL_STATUS ||
            col === COL_ACTIONS
          ) {
            e.preventDefault();
            startEditing(row, col);
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (col === COL_DESC) {
              e.preventDefault();
              startEditing(row, col, e.key);
            } else if (col === COL_AMOUNT && /^[0-9.,-]$/.test(e.key)) {
              e.preventDefault();
              startEditing(row, col, e.key);
            }
          }
          break;
      }
    },
    [editingCell, moveActive, moveNext, startEditing],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        commitTextEdit(row, col, draftValue);
        moveActive(row + 1, col);
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        commitTextEdit(row, col, draftValue);
        moveNext(row, col, e.shiftKey ? -1 : 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        setEditingCell(null);
        requestAnimationFrame(() => focusCell(row, col));
      }
    },
    [commitTextEdit, draftValue, focusCell, moveActive, moveNext],
  );

  const handleInputBlur = useCallback(
    (row: number, col: number) => {
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      commitTextEdit(row, col, draftValue);
    },
    [commitTextEdit, draftValue],
  );

  const handleCloseSelect = useCallback(
    (row: number, col: number) => {
      setEditingCell(null);
      requestAnimationFrame(() => focusCell(row, col));
    },
    [focusCell],
  );

  return (
    <div className={cn("flex flex-col", isFullscreen && "h-full min-h-0")}>
      {/* Keyboard navigation hint bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↑↓←→</kbd>{" "}
            Navegar
          </span>
          <span>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Enter</kbd> /{" "}
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">F2</kbd>{" "}
            Editar
          </span>
          <span>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Tab</kbd>{" "}
            Próxima célula
          </span>
          <span>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
            Cancelar edição
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-muted-foreground/80">
            Células alteradas ficam destacadas em verde
          </span>
          {!isFullscreen && onToggleFullscreen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Tela Cheia
            </Button>
          )}
        </div>
      </div>

      {/* Spreadsheet container */}
      <div className={cn("overflow-auto", isFullscreen ? "flex-1 min-h-0" : "max-h-[calc(100vh-300px)] min-h-[360px]")}>
        <table className="w-full border-collapse text-xs sm:text-sm select-none">
          <thead className="sticky top-0 z-20 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr className="h-9 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-10 border-b border-r border-border/70 bg-muted/80 px-2 text-center">#</th>
              <th className="w-24 border-b border-r border-border/70 px-2.5">Tipo</th>
              <th className="min-w-[220px] border-b border-r border-border/70 px-2.5">Descrição</th>
              <th className="w-32 border-b border-r border-border/70 px-2.5 text-right">Valor</th>
              <th className="w-32 border-b border-r border-border/70 px-2.5">Vencimento</th>
              <th className="w-44 border-b border-r border-border/70 px-2.5">Categoria</th>
              <th className="w-44 border-b border-r border-border/70 px-2.5">Subcategoria</th>
              <th className="w-40 border-b border-r border-border/70 px-2.5">Fatura</th>
              <th className="w-28 border-b border-r border-border/70 px-2.5">Status</th>
              <th className="w-14 border-b border-border/70 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((tx, rowIdx) => (
              <ExcelGridRow
                key={tx.id}
                tx={tx}
                rowIdx={rowIdx}
                pending={pendingChanges[tx.id]}
                editingCol={editingCell?.row === rowIdx ? editingCell.col : null}
                draftValue={editingCell?.row === rowIdx ? draftValue : ""}
                inputRef={inputRef}
                categoryMap={categoryMap}
                invoiceLabelMap={invoiceLabelMap}
                orderedCategories={orderedCategories}
                invoiceOptions={invoiceOptions}
                setCellRef={setCellRef}
                onCellClick={handleCellClick}
                onCellDoubleClick={handleCellDoubleClick}
                onCellKeyDown={handleCellKeyDown}
                onDraftChange={setDraftValue}
                onInputKeyDown={handleInputKeyDown}
                onInputBlur={handleInputBlur}
                onFieldChange={onFieldChange}
                onToggleDelete={onToggleDelete}
                onCloseSelect={handleCloseSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
