"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportTransactionsToCSV } from "@/lib/utils/export";

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
      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
      <span className="hidden sm:inline">Exportar CSV</span>
      <span className="sm:hidden">Exportar</span>
    </Button>
  );
}
