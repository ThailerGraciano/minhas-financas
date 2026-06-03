'use client';

import { useState } from 'react';
import { updateClosingDay } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsForm({ initialClosingDay }: { initialClosingDay: number }) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const closingDay = Number(formData.get('closingDay'));

    const result = await updateClosingDay(closingDay);
    
    if (result.success) {
      setMessage('Configurações salvas com sucesso!');
    } else {
      setMessage('Erro ao salvar as configurações.');
    }
    
    setIsPending(false);
  };

  return (
    <Card className="w-full max-w-md mt-8">
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>Gerencie suas preferências do sistema.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closingDay">Dia de Fechamento do Mês</Label>
            <Input 
              id="closingDay" 
              name="closingDay" 
              type="number" 
              min="1" 
              max="31" 
              defaultValue={initialClosingDay}
              required 
            />
            <p className="text-sm text-muted-foreground">
              Usado para calcular os totais mensais baseados em quando o seu mês contábil "vira".
            </p>
          </div>
          {message && (
            <p className={`text-sm font-medium ${message.includes('Erro') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
              {message}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
