"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Landmark, HandCoins, TrendingDown, Percent } from "lucide-react";

import { getLoansPageData } from "@/app/actions/loans";
import { LoanFormDialog } from "@/components/loan-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

type LoansPageData = Awaited<ReturnType<typeof getLoansPageData>>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const chartConfig = {
  "Dívida Externa": {
    label: "Dívida Externa",
    color: "#ef4444", // red
  },
  "Dívida Interna": {
    label: "Dívida Interna",
    color: "#f97316", // orange
  },
} satisfies ChartConfig;

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
};

const AmortizationTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border text-popover-foreground rounded-lg shadow-md p-3 min-w-[200px]">
      <div className="font-semibold mb-2 border-b pb-1">{label}</div>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-muted-foreground font-medium">{entry.dataKey}</span>
            </div>
            <span className="font-bold ml-4">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function LoansClientPage({ data }: { data: LoansPageData }) {
  const { loans, bankDebtTotal, personalDebtTotal, amortizationData } = data;

  const hasLoans = loans.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-8 h-8 text-primary" />
            Empréstimos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus empréstimos e acompanhe a amortização
          </p>
        </div>
        <LoanFormDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dívida Externa</CardTitle>
            <Landmark className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(bankDebtTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Instituições financeiras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dívida Interna</CardTitle>
            <HandCoins className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(personalDebtTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Empréstimos pessoais</p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Contract Cards */}
      {hasLoans ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Contratos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold truncate">{loan.name}</CardTitle>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        loan.type === "bank"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-orange-500/10 text-orange-500"
                      }`}
                    >
                      {loan.type === "bank" ? "Financeira" : "Pessoal"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Principal</span>
                      <p className="font-semibold">{formatCurrency(loan.totalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" /> Juros
                      </span>
                      <p className="font-semibold">{loan.interestRate}% a.m.</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total a Pagar</span>
                      <p className="font-semibold">{formatCurrency(loan.totalToPay)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Já Pago</span>
                      <p className="font-semibold text-green-500">{formatCurrency(loan.totalPaid)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Landmark className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Nenhum empréstimo cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Clique em &quot;Novo Empréstimo&quot; para começar a controlar suas dívidas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Amortization Chart */}
      {amortizationData.length > 0 && (
        <div className="bg-card rounded-none sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
          <div className="flex flex-row items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Curva de Amortização</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projeção do saldo devedor caindo mês a mês até a quitação
              </p>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <AreaChart accessibilityLayer data={amortizationData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillBankDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillPersonalDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    notation: "compact",
                  }).format(value)
                }
                width={80}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.1 }}
                content={<AmortizationTooltip />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="Dívida Externa"
                stackId="a"
                stroke="#ef4444"
                fill="url(#fillBankDebt)"
              />
              <Area
                type="monotone"
                dataKey="Dívida Interna"
                stackId="a"
                stroke="#f97316"
                fill="url(#fillPersonalDebt)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

