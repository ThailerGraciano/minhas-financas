"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Percent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { updateInstallmentDate } from "@/app/actions/loans";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompetency = (monthStr: string) => {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const formatted = format(date, "MMM/yyyy", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

function calculateCompetency(dateStr: string, closingDay: number): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1; // 0-based
  const day = Number(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return "";

  if (day > closingDay) {
    const nextMonth = new Date(year, month + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

type LoanInstallment = {
  id: number;
  amount: number;
  date: string;
  competencyMonth: string;
  status: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
};

export type LoanDetails = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  interestRate: number;
  installments: number;
  createdAt: Date;
  totalToPay: number;
  totalPaid: number;
  remaining: number;
  progressPercent: number;
  installmentList: LoanInstallment[];
};

type LoanDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: LoanDetails | null;
  closingDay: number;
};

export function LoanDetailsDialog({ open, onOpenChange, loan, closingDay }: LoanDetailsDialogProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  if (!loan) return null;

  const handleDateChange = async (installment: LoanInstallment, newDateStr: string) => {
    if (!newDateStr) return;

    const newCompetency = calculateCompetency(newDateStr, closingDay);
    if (!newCompetency) return;

    try {
      setIsUpdating(installment.id);
      await updateInstallmentDate(installment.id, newDateStr, newCompetency);
      toast.success("Data da parcela atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar a data");
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">{loan.name}</DialogTitle>
            <Badge
              variant={loan.type === "bank" ? "destructive" : "default"}
              className={loan.type === "personal" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {loan.type === "bank" ? "Financeira" : "Pessoal"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 shrink-0 border-b">
          <div>
            <span className="text-xs text-muted-foreground">Principal</span>
            <p className="font-semibold">{formatCurrency(loan.totalAmount)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /> Juros
            </span>
            <p className="font-semibold">{loan.interestRate}% a.m.</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Total a Pagar</span>
            <p className="font-semibold">{formatCurrency(loan.totalToPay)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Já Pago</span>
            <p className="font-semibold text-green-500">{formatCurrency(loan.totalPaid)}</p>
          </div>
        </div>

        <div className="space-y-1.5 shrink-0 py-2 border-b">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium">{loan.progressPercent}%</span>
          </div>
          <Progress value={loan.progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Restante: {formatCurrency(loan.remaining)}</span>
            <span>{loan.installments} parcelas</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 mt-4 rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead className="w-[180px]">Data de Pgto.</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.installmentList?.map((inst: LoanInstallment) => {
                const calculatedCompetency = calculateCompetency(inst.date, closingDay);
                const isPaid = inst.status === "paid";

                return (
                  <TableRow key={inst.id} className={isPaid ? "opacity-75" : ""}>
                    <TableCell className="font-medium">
                      {inst.installmentCurrent}/{inst.installmentTotal}
                    </TableCell>
                    <TableCell>{formatCurrency(inst.amount)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{formatCompetency(calculatedCompetency)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          key={inst.date}
                          type="date"
                          defaultValue={inst.date}
                          onBlur={(e) => {
                            if (e.target.value !== inst.date) {
                              handleDateChange(inst, e.target.value);
                            }
                          }}
                          className="h-8 text-sm w-36"
                          disabled={isUpdating === inst.id || isPaid}
                        />
                        {isUpdating === inst.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isPaid ? (
                        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                          Pago
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
