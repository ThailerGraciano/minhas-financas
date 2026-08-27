"use client";

import { deleteTransaction } from "@/app/actions/transactions";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionStatusToggle } from "./transaction-status-toggle";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: string | number;
  status: string;
  type: string;
  categoryId?: number | null;
  subcategoryId?: number | null;
  accountId?: number | null;
  creditCardId?: number | null;
  category?: { name: string } | null;
  competencyMonth?: string;
  fixedTransactionId?: string | null;
  installmentTotal?: number | null;
}

export function InvoiceTransactionList({ transactions }: { transactions: Transaction[] }) {
  const [sortField, setSortField] = useState<"date" | "description" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "description") {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === "amount") {
        comparison = Number(a.amount) - Number(b.amount);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [transactions, sortField, sortOrder]);

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
    const [, month, day] = dateStr.split("-");
    return `${day}/${month}`;
  };

  return (
    <>
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
                  {formatDate(tx.date)}
                </TableCell>
                <TableCell className="max-w-[90px] sm:max-w-[250px] px-1 sm:px-4 py-2 sm:py-4">
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate text-[11px] sm:text-sm leading-tight" title={tx.description}>
                      {tx.description}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] sm:text-xs text-muted-foreground mt-0.5 overflow-hidden">
                      <span
                        className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-[2px] truncate"
                        title={tx.category?.name || "Sem categoria"}
                      >
                        {tx.category?.name || "Sem categoria"}
                      </span>
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
