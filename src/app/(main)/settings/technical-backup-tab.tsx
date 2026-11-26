"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Database,
  DatabaseBackup,
  Download,
  HardDrive,
  Layers,
  RefreshCw,
  Server,
  ShieldAlert,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateSqlBackup,
  getTechnicalOverview,
  type TechnicalOverviewResult,
} from "@/app/actions/backup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/backup-sql";

interface LastBackupInfo {
  filename: string;
  generatedAt: string;
  sizeBytes: number;
  totalRows: number;
  tableCount: number;
}

const LAST_BACKUP_STORAGE_KEY = "minhas-financas:last-sql-backup";
const backupStoreListeners = new Set<() => void>();

function isLastBackupInfo(value: unknown): value is LastBackupInfo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.filename === "string" &&
    typeof record.generatedAt === "string" &&
    typeof record.sizeBytes === "number" &&
    typeof record.totalRows === "number" &&
    typeof record.tableCount === "number"
  );
}

function subscribeLastBackup(listener: () => void): () => void {
  backupStoreListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LAST_BACKUP_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    backupStoreListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getLastBackupRawSnapshot(): string | null {
  try {
    return window.localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getLastBackupServerSnapshot(): string | null {
  return null;
}

function saveLastBackupInfo(info: LastBackupInfo): void {
  try {
    window.localStorage.setItem(LAST_BACKUP_STORAGE_KEY, JSON.stringify(info));
    for (const listener of backupStoreListeners) {
      listener();
    }
  } catch {
    // Ignora falhas de localStorage (ex: modo privado restrito)
  }
}

function formatDateTimePtBr(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function triggerSqlDownload(filename: string, sqlContent: string): void {
  const blob = new Blob([sqlContent], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TechnicalBackupTab({ initialData }: { initialData: TechnicalOverviewResult }) {
  const [overview, setOverview] = useState<TechnicalOverviewResult>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const rawLastBackup = useSyncExternalStore(
    subscribeLastBackup,
    getLastBackupRawSnapshot,
    getLastBackupServerSnapshot,
  );

  const lastBackup = useMemo<LastBackupInfo | null>(() => {
    if (!rawLastBackup) return null;
    try {
      const parsed: unknown = JSON.parse(rawLastBackup);
      return isLastBackupInfo(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [rawLastBackup]);

  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getTechnicalOverview();
      setOverview(fresh);
      if (fresh.success) {
        toast.success("Métricas técnicas atualizadas.");
      } else {
        toast.error(fresh.error);
      }
    } catch {
      toast.error("Erro ao atualizar as métricas do banco de dados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const result = await generateSqlBackup();
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      triggerSqlDownload(result.filename, result.sqlContent);

      saveLastBackupInfo({
        filename: result.filename,
        generatedAt: result.generatedAt,
        sizeBytes: result.sizeBytes,
        totalRows: result.totalRows,
        tableCount: result.tableCount,
      });

      toast.success(
        `Backup SQL gerado (${formatBytes(result.sizeBytes)} • ${result.totalRows.toLocaleString("pt-BR")} registros).`,
      );
    } catch {
      toast.error("Erro inesperado ao exportar o backup SQL.");
    } finally {
      setIsDownloading(false);
    }
  };

  const usagePercentage = useMemo(() => {
    if (!overview.success) return 0;
    const pct = (overview.data.databaseTotalBytes / overview.data.supabaseFreeLimitBytes) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [overview]);

  const usageStatus = useMemo(() => {
    if (usagePercentage > 85) {
      return {
        label: "Crítico",
        className: "border-destructive/30 bg-destructive/15 text-destructive",
      };
    }
    if (usagePercentage >= 70) {
      return {
        label: "Atenção",
        className: "border-amber-500/30 bg-amber-500/15 text-amber-400",
      };
    }
    return {
      label: "Saudável",
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    };
  }, [usagePercentage]);

  return (
    <div className="space-y-6">
      {/* Card de Exportação de Backup SQL */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
              <DatabaseBackup className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Exportar Backup Local (SQL)</CardTitle>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  SQL • PostgreSQL
                </Badge>
              </div>
              <CardDescription>
                Gere um dump completo das 18 tabelas com integridade referencial para guardar localmente ou restaurar
                em qualquer PostgreSQL / Supabase.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Button
              type="button"
              onClick={handleDownloadBackup}
              isLoading={isDownloading}
              disabled={isDownloading}
              size="lg"
              className="px-4"
            >
              {!isDownloading && <Download className="size-4" />}
              {isDownloading ? "Gerando SQL..." : "Baixar Backup (.sql)"}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          {lastBackup && (
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">Último backup neste navegador:</span>
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {lastBackup.filename}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground tabular-nums">
                <span>{formatBytes(lastBackup.sizeBytes)}</span>
                <span>•</span>
                <span>{lastBackup.totalRows.toLocaleString("pt-BR")} registros</span>
                <span>•</span>
                <span>{formatDateTimePtBr(lastBackup.generatedAt)}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200/90">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <p>
              Este backup exporta <strong>todas as tabelas do banco</strong> (incluindo registros financeiros e
              usuários). Armazene o arquivo `.sql` em um local seguro e privado.
            </p>
          </div>

          <details className="group rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-muted-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground select-none">
              <span>Como restaurar este backup no Supabase ou PostgreSQL</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-4 leading-relaxed">
              <li>
                Em um banco novo/vazio, garanta que as tabelas existam rodando{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  npx drizzle-kit push
                </code>{" "}
                ou aplicando as migrações da pasta{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground">drizzle/</code>.
              </li>
              <li>
                Para restaurar via terminal, execute:{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  psql &quot;$DATABASE_URL&quot; -f arquivo-backup.sql
                </code>{" "}
                (ou cole o conteúdo no <strong>SQL Editor</strong> do Supabase).
              </li>
            </ol>
          </details>
        </CardContent>
      </Card>

      {!overview.success ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              <CardTitle>Não foi possível carregar os dados técnicos</CardTitle>
            </div>
            <CardDescription>{overview.error}</CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshMetrics}
                isLoading={isRefreshing}
              >
                {!isRefreshing && <RefreshCw className="size-3.5" />}
                Tentar novamente
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* KPIs Técnicos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <HardDrive className="size-3.5 text-primary" />
                  Uso no Supabase Free
                </CardDescription>
                <CardAction>
                  <Badge variant="outline" className={usageStatus.className}>
                    {usageStatus.label}
                  </Badge>
                </CardAction>
                <CardTitle className="text-xl font-bold tabular-nums">
                  {formatBytes(overview.data.databaseTotalBytes)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={usagePercentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {usagePercentage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de{" "}
                  {formatBytes(overview.data.supabaseFreeLimitBytes)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Database className="size-3.5 text-primary" />
                  Dados da Aplicação (public)
                </CardDescription>
                <CardTitle className="text-xl font-bold tabular-nums">
                  {formatBytes(overview.data.publicTablesTotalBytes)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Dados: {formatBytes(overview.data.publicTablesDataBytes)} • Índices:{" "}
                  {formatBytes(overview.data.publicTablesIndexBytes)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Layers className="size-3.5 text-primary" />
                  Registros Totais
                </CardDescription>
                <CardTitle className="text-xl font-bold tabular-nums">
                  {overview.data.totalRecords.toLocaleString("pt-BR")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Distribuídos em {overview.data.tables.length} tabelas
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Activity className="size-3.5 text-emerald-400" />
                  Status da Conexão
                </CardDescription>
                <CardAction>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                    Online
                  </Badge>
                </CardAction>
                <CardTitle className="text-xl font-bold tabular-nums">{overview.data.latencyMs} ms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Verificado às {formatDateTimePtBr(overview.data.checkedAt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dados do Ambiente & Stack */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                <CardTitle>Dados Técnicos do Ambiente</CardTitle>
              </div>
              <CardDescription>
                Informações em tempo real do servidor PostgreSQL, runtime e stack da aplicação.
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshMetrics}
                  isLoading={isRefreshing}
                >
                  {!isRefreshing && <RefreshCw className="size-3.5" />}
                  Atualizar
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Provedor</dt>
                  <dd className="mt-1 font-medium text-foreground">{overview.data.providerLabel}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Motor do Banco</dt>
                  <dd className="mt-1 font-medium text-foreground">{overview.data.postgresVersionShort}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Database / Schema</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-foreground">
                    {overview.data.databaseName} (public)
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">ORM &amp; Driver</dt>
                  <dd className="mt-1 font-medium text-foreground">Drizzle ORM + postgres.js</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Versão do App</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-foreground">v{overview.data.appVersion}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Framework</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-foreground">
                    Next.js {overview.data.nextVersion}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Runtime Node.js</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-foreground">{overview.data.nodeVersion}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-xs text-muted-foreground">Escopo do Backup</dt>
                  <dd className="mt-1 font-medium text-foreground">Completo ({overview.data.tables.length} tabelas)</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Inventário de Tabelas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Table2 className="size-4 text-primary" />
                <CardTitle>Inventário de Tabelas</CardTitle>
              </div>
              <CardDescription>
                Contagem atual de registros e tamanho físico ocupado por cada tabela do schema{" "}
                <code className="font-mono text-xs">public</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Dados</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Índices</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.data.tables.map((table) => {
                    const sharePct =
                      overview.data.publicTablesTotalBytes > 0
                        ? Math.round((table.totalBytes / overview.data.publicTablesTotalBytes) * 100)
                        : 0;

                    return (
                      <TableRow key={table.tableName}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{table.label}</span>
                            <span className="font-mono text-xs text-muted-foreground">{table.tableName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {table.rowCount.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                          {formatBytes(table.tableBytes)}
                        </TableCell>
                        <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                          {formatBytes(table.indexBytes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="inline-flex flex-col items-end gap-1">
                            <span className="font-medium text-foreground">{formatBytes(table.totalBytes)}</span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.max(sharePct, table.totalBytes > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
