"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { importCSV } from "@/app/actions/import";

type ImportResult = {
  success: boolean;
  error?: string;
  result?: {
    totalRows: number;
    successRows: number;
    skippedRows: number;
    errorRows: number;
    errorsDetail: { row: number; data: Record<string, string>; error: string }[];
  };
};

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<"expense" | "income" | "transfer">("expense");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportResult(null); // Reseta o resultado ao selecionar novo arquivo
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvString = event.target?.result as string;
        if (csvString) {
          const res = await importCSV(csvString, activeTab, file.name);
          setImportResult(res);
        }
        setIsImporting(false);
      };
      reader.onerror = () => {
        setImportResult({ success: false, error: "Falha ao ler o arquivo." });
        setIsImporting(false);
      };
      reader.readAsText(file);
    } catch (error) {
      const e = error as Error;
      setImportResult({ success: false, error: e.message || "Erro desconhecido." });
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Importar Transações</h1>
        <p className="text-muted-foreground">
          Faça o upload do seu arquivo CSV contendo os registros de despesas, receitas ou transferências.
        </p>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(val) => {
          setActiveTab(val as "expense" | "income" | "transfer");
          setFile(null);
          setImportResult(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="transfer">Transferências</TabsTrigger>
        </TabsList>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Upload de CSV - {activeTab === 'expense' ? 'Despesas' : activeTab === 'income' ? 'Receitas' : 'Transferências'}</CardTitle>
            <CardDescription>
              Selecione o arquivo CSV contendo suas {activeTab === 'expense' ? 'despesas' : activeTab === 'income' ? 'receitas' : 'transferências'} para importação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="w-full">
              <Label 
                htmlFor="csv-file"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground/60" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Clique para selecionar</span> ou arraste e solte
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Apenas arquivos .CSV são suportados
                  </p>
                </div>
                <Input 
                  id="csv-file" 
                  type="file" 
                  accept=".csv" 
                  className="hidden"
                  onChange={handleFileChange}
                />
              </Label>
            </div>

            {file && (
              <div className="flex items-center gap-3 text-sm bg-background border rounded-lg p-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            <Button 
              className="w-full h-11" 
              onClick={handleImport} 
              disabled={!file || isImporting}
            >
              {isImporting ? (
                "Processando Importação..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Iniciar Importação de {activeTab === 'expense' ? 'Despesas' : activeTab === 'income' ? 'Receitas' : 'Transferências'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </Tabs>

      {importResult && (
        <Card className={`overflow-hidden border-2 ${importResult.success ? 'border-green-500/30' : 'border-destructive/30'}`}>
          <div className={`h-1.5 w-full ${importResult.success ? 'bg-green-500' : 'bg-destructive'}`} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {importResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Importação Concluída
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Erro na Importação
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {importResult.success && importResult.result ? (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="text-3xl font-bold">{importResult.result.totalRows}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total de Linhas</div>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {importResult.result.successRows}
                    </div>
                    <div className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">Sucesso</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {importResult.result.skippedRows}
                    </div>
                    <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">Ignoradas (já existiam)</div>
                  </div>
                  <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                    <div className="text-3xl font-bold text-destructive">
                      {importResult.result.errorRows}
                    </div>
                    <div className="text-xs text-destructive/80 mt-1">Erros</div>
                  </div>
                </div>

                {importResult.result.errorsDetail && importResult.result.errorsDetail.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      Detalhes dos Erros
                    </h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-lg border border-border p-1 bg-muted/30">
                      {importResult.result.errorsDetail.map((err, i) => (
                        <div key={i} className="text-sm p-3 bg-background rounded-md border border-border flex flex-col gap-1">
                          <span className="font-medium text-destructive">Linha {err.row}</span>
                          <span className="text-muted-foreground">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-destructive font-medium p-4 bg-destructive/10 rounded-lg">
                {importResult.error || "Ocorreu um erro desconhecido durante a importação."}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
