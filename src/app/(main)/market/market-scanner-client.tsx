'use client';

import { useState, useRef } from 'react';
import { Camera, FileText, Loader2, Upload, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { processMarketReceipt, MarketReceiptData, saveMarketReceipt } from '@/app/actions/market';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { ReceiptReviewGrid } from './receipt-review-grid';

export function MarketScannerClient() {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [result, setResult] = useState<MarketReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // O resultado vem como "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        // Precisamos extrair apenas o base64 para enviar ao Gemini
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleImageProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await processMarketReceipt({
        type: 'image',
        base64,
        mimeType: file.type,
      });

      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Erro inesperado ao processar a imagem.');
    } finally {
      setLoading(false);
      // Reseta o input para permitir enviar a mesma imagem novamente se necessário
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextProcess = async () => {
    if (!textInput.trim()) {
      setError('Por favor, insira o texto do cupom fiscal ou o JSON gerado.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Tenta fazer o parse caso o usuário tenha colado diretamente o JSON de outra IA
    try {
      const jsonStart = textInput.indexOf('{');
      const jsonEnd = textInput.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const potentialJson = textInput.substring(jsonStart, jsonEnd);
        const parsed = JSON.parse(potentialJson);
        if (parsed && Array.isArray(parsed.items)) {
          setResult(parsed as MarketReceiptData);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Ignora erro de parse, pois significa que é texto livre que vai pra nossa IA
    }

    try {
      const res = await processMarketReceipt({
        type: 'text',
        text: textInput,
      });

      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Erro inesperado ao processar o texto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mt-2">
        Envie a foto ou o texto do seu cupom fiscal e a inteligência artificial vai extrair e categorizar tudo automaticamente.
      </p>

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="gap-2">
            <Camera className="w-4 h-4" />
            Imagem / Câmera
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <FileText className="w-4 h-4" />
            Texto Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tirar Foto ou Fazer Upload</CardTitle>
              <CardDescription>
                Tire uma foto clara do cupom fiscal usando a câmera do seu celular ou envie um arquivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageProcess}
              />
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <Button 
                  size="lg" 
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  {loading ? 'Processando Imagem...' : 'Abrir Câmera / Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Colar Texto Manualmente</CardTitle>
              <CardDescription className="space-y-4">
                <p>Copie e cole o texto de um cupom fiscal eletrônico ou digite os itens manualmente.</p>
                
                <Accordion type="single" collapsible className="w-full border border-primary/20 bg-primary/5 rounded-md px-4 mt-4">
                  <AccordionItem value="prompt" className="border-none">
                    <AccordionTrigger className="text-sm py-3 font-semibold hover:no-underline text-primary">
                      Prefere usar outra Inteligência Artificial (ChatGPT, Claude)?
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 pb-4">
                      <p className="text-sm text-foreground">
                        Copie o prompt exato que usamos clicando no botão abaixo, envie para a IA de sua preferência junto com a foto ou texto do seu cupom, 
                        e então <strong className="text-primary">cole apenas o resultado (JSON)</strong> na caixa de texto abaixo. 
                        O sistema vai reconhecer automaticamente o JSON e pular a etapa de processamento!
                      </p>
                      <div className="relative group">
                        <div className="bg-background p-4 rounded-md text-xs font-mono text-muted-foreground max-h-60 overflow-y-auto border border-border shadow-inner whitespace-pre-wrap select-all">
                          {SYSTEM_PROMPT}
                        </div>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(SYSTEM_PROMPT);
                            alert("Prompt copiado com sucesso! Cole na IA de sua preferência.");
                          }}
                          title="Copiar Prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Cole o texto do cupom fiscal ou o JSON final gerado por outra IA aqui..."
                className="min-h-[250px] text-sm bg-background border-primary/20 focus-visible:ring-primary/50 shadow-sm"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={handleTextProcess} 
                disabled={loading || !textInput.trim()}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {loading ? 'Processando Texto...' : 'Processar Texto'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {result && (
        <Card className="border-primary/20 bg-primary/5 mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Revisão dos Dados Extraídos</CardTitle>
            <CardDescription>
              Verifique e ajuste os dados se necessário. A IA pode ocasionalmente cometer erros em cupons amassados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReceiptReviewGrid 
              initialData={result} 
              isSaving={isSaving}
              onSave={async (finalData, selectedTxIds) => {
                setIsSaving(true);
                setError(null);
                try {
                  const res = await saveMarketReceipt(finalData, selectedTxIds);
                  if (res.success) {
                    alert('Compra salva e vinculada com sucesso!');
                    setResult(null); // Reseta a tela
                    setTextInput('');
                  } else {
                    setError(res.error || 'Erro ao salvar a compra.');
                  }
                } catch {
                  setError('Erro inesperado de rede ao salvar.');
                } finally {
                  setIsSaving(false);
                }
              }} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
