"use client";

import { Button } from "@/components/ui/button";
import { exportTransactionsToCSV } from "@/lib/utils/export";
import { Download } from "lucide-react";

interface ExportCSVButtonProps {
  transactions: {
    date: string;
    description: string | null;
    amount: string | number;
    type: string;
    status: string;
    category?: { name: string } | null;
    subcategory?: { name: string } | null;
  }[];
  invoiceMonth: string;
  cardName: string;
}

export function ExportCSVButton({ transactions, invoiceMonth, cardName }: ExportCSVButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs sm:text-sm px-2 sm:px-3"
      onClick={() => exportTransactionsToCSV(transactions, invoiceMonth, cardName)}
    >
      <Download className="w-4 h-4 sm:mr-2" />
      <span className="sr-only">Exportar</span>
    </Button>
  );
}
