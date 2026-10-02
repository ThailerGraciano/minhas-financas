"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  HandCoins,
  Info,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { LoanOriginAccount, OriginAccountProgressionMonth } from "@/app/actions/loans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoanOriginAccountCardProps {
  originAccounts: LoanOriginAccount[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompetency = (monthStr: string) => {
  if (!monthStr) return "";
  const date = parseISO(`${monthStr}-01`);
  const formatted = format(date, "MMM/yyyy", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatShortMonth = (monthStr: string) => {
  if (!monthStr) return "";
  const date = parseISO(`${monthStr}-01`);
  const formatted = format(date, "MMM/yy", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case "checking":
      return "Conta Corrente";
    case "savings":
      return "Poupança";
    case "wallet":
      return "Carteira";
    case "stash":
      return "Caixinha / Reserva";
    case "food":
      return "Alimentação";
    case "meal":
      return "Refeição";
    default:
      return type;
  }
};

const chartConfig = {
  projectedBalance: {
    label: "Saldo Projetado",
    color: "#10b981", // emerald
  },
} satisfies ChartConfig;

type TooltipPayload = {
  payload?: OriginAccountProgressionMonth;
};

const CustomProgressionTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;

  return (
    <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3.5 min-w-[240px] space-y-2">
      <div className="flex items-center justify-between border-b pb-1.5 font-bold text-sm">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {formatCompetency(label || p.month)}
        </span>
        <span className="text-xs text-muted-foreground">Competência</span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Saldo Inicial:</span>
          <span className="font-semibold text-foreground">{formatCurrency(p.startingBalance)}</span>
        </div>

        {p.loanReimbursements > 0 && (
          <div className="flex justify-between items-center text-orange-400 font-medium">
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" /> (+) Devolução Empréstimo:
            </span>
            <span>+{formatCurrency(p.loanReimbursements)}</span>
          </div>
        )}

        {p.otherIncomes > 0 && (
          <div className="flex justify-between items-center text-emerald-400 font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> (+) Outras Receitas:
            </span>
            <span>+{formatCurrency(p.otherIncomes)}</span>
          </div>
        )}

        {p.otherOutflows > 0 && (
          <div className="flex justify-between items-center text-rose-400 font-medium">
            <span>(-) Despesas Previstas:</span>
            <span>-{formatCurrency(p.otherOutflows)}</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-1.5 flex justify-between items-center font-bold text-sm">
          <span>Saldo Projetado:</span>
          <span className="text-emerald-400">{formatCurrency(p.projectedBalance)}</span>
        </div>
      </div>
    </div>
  );
};

export function LoanOriginAccountCard({ originAccounts }: LoanOriginAccountCardProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number>(() => originAccounts[0]?.accountId ?? 0);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [showTableAllRows, setShowTableAllRows] = useState(false);

  const selectedAccount = useMemo(() => {
    return originAccounts.find((a) => a.accountId === selectedAccountId) || originAccounts[0] || null;
  }, [originAccounts, selectedAccountId]);

  if (!selectedAccount) return null;

  const totalGrowth = selectedAccount.finalProjectedBalance - selectedAccount.currentBalance;
  const growthPercent =
    selectedAccount.currentBalance > 0
      ? (totalGrowth / selectedAccount.currentBalance) * 100
      : totalGrowth > 0
        ? 100
        : 0;

  const progressionData = selectedAccount.monthlyProgression;
  const tableRows = showTableAllRows ? progressionData : progressionData.slice(0, 6);

  return (
    <Card className="rounded-3xl border border-white/10 shadow-sm overflow-hidden bg-card/60 backdrop-blur">
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-bold">Conta Origem do Dinheiro</CardTitle>
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20">
                  Conta Credora
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conta de onde saiu o empréstimo, valor devido e progressão do saldo mês a mês
              </p>
            </div>
          </div>

          {/* Multiple origin accounts tabs */}
          {originAccounts.length > 1 && (
            <Tabs
              value={String(selectedAccount.accountId)}
              onValueChange={(val) => setSelectedAccountId(Number(val))}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
                {originAccounts.map((acc) => (
                  <TabsTrigger key={acc.accountId} value={String(acc.accountId)} className="text-xs">
                    {acc.accountName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Saldo Atual */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Saldo Atual</span>
              <Wallet className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {formatCurrency(selectedAccount.currentBalance)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedAccount.accountName} ({getAccountTypeLabel(selectedAccount.accountType)})
              </p>
            </div>
          </div>

          {/* 2. Valor que Devo pra Conta */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-orange-500/5 border border-orange-500/15 space-y-2">
            <div className="flex items-center justify-between text-orange-400">
              <span className="text-xs font-medium">Devo pra Conta</span>
              <HandCoins className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-orange-500">
                {formatCurrency(selectedAccount.totalOwed)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedAccount.loansCount} empréstimo(s) pendente(s)
              </p>
            </div>
          </div>

          {/* 3. Outras Receitas Previstas */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Outras Receitas</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-400">
                +{formatCurrency(selectedAccount.otherRevenuesTotal)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Aportes e receitas até a quitação</p>
            </div>
          </div>

          {/* 4. Valor Total Final da Conta */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-semibold">Valor Total Final</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {formatCurrency(selectedAccount.finalProjectedBalance)}
              </div>
              <div className="flex items-center text-[11px] text-emerald-400 font-semibold mt-0.5">
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />+{formatCurrency(totalGrowth)} (
                {growthPercent >= 0 ? `+${growthPercent.toFixed(1)}%` : `${growthPercent.toFixed(1)}%`})
              </div>
            </div>
          </div>
        </div>

        {/* View Switch: Gráfico vs Tabela */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Progressão do Saldo da Conta Origem
              </h3>
              <p className="text-xs text-muted-foreground">
                Evolução com as parcelas dos empréstimos somadas às outras receitas mês a mês
              </p>
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-white/5">
              <Button
                variant={viewMode === "chart" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Gráfico
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Tabela Mês a Mês
              </Button>
            </div>
          </div>

          {/* Mode 1: Chart */}
          {viewMode === "chart" && progressionData.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 min-h-[320px]">
              <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
                <AreaChart
                  accessibilityLayer
                  data={progressionData}
                  margin={{ top: 16, right: 12, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillOriginBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatShortMonth}
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
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
                    width={75}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                    content={<CustomProgressionTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="projectedBalance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#fillOriginBalance)"
                    activeDot={{ r: 4, fill: "#10b981" }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}

          {/* Mode 2: Table */}
          {viewMode === "table" && progressionData.length > 0 && (
            <div className="space-y-2">
              <div className="rounded-2xl border border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Saldo Anterior</TableHead>
                      <TableHead className="text-right text-orange-400">(+) Empréstimo</TableHead>
                      <TableHead className="text-right text-emerald-400">(+) Outras Receitas</TableHead>
                      <TableHead className="text-right">Total Mês</TableHead>
                      <TableHead className="text-right font-bold text-foreground">Saldo Projetado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.month} className="hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-semibold">{formatCompetency(row.month)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.startingBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.loanReimbursements > 0 ? (
                            <span className="font-semibold text-orange-400">
                              +{formatCurrency(row.loanReimbursements)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.otherIncomes > 0 ? (
                            <span className="font-semibold text-emerald-400">+{formatCurrency(row.otherIncomes)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.netMonth > 0 ? (
                            <span className="text-emerald-400">+{formatCurrency(row.netMonth)}</span>
                          ) : (
                            <span>{formatCurrency(row.netMonth)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(row.projectedBalance)}
                        </TableCell>
                        <TableCell>
                          {(row.loanItems.length > 0 || row.otherItems.length > 0) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                  <Info className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3 space-y-2 text-xs" align="end">
                                <p className="font-semibold border-b pb-1">
                                  Detalhamento de {formatCompetency(row.month)}
                                </p>
                                {row.loanItems.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="font-medium text-orange-400 block">Devoluções de Empréstimo:</span>
                                    {row.loanItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-muted-foreground pl-2">
                                        <span className="truncate max-w-[170px]">{item.description}</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(item.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {row.otherItems.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="font-medium text-emerald-400 block">
                                      Outras Receitas Previstas:
                                    </span>
                                    {row.otherItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-muted-foreground pl-2">
                                        <span className="truncate max-w-[170px]">{item.description}</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(item.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {progressionData.length > 6 && (
                <div className="flex justify-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTableAllRows((prev) => !prev)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showTableAllRows ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Ver menos meses
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> Ver todos os {progressionData.length} meses até a
                        quitação
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
