'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { saveAllocationSettings } from '@/app/actions/allocations';

const allocationSchema = z.object({
  baseKeepAmount: z.number().min(0, "O valor deve ser maior ou igual a zero"),
  rules: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "O nome é obrigatório"),
      percentage: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
    })
  )
});

type AllocationFormValues = z.infer<typeof allocationSchema>;

interface AllocationConfigDialogProps {
  initialData?: AllocationFormValues;
}

export function AllocationConfigDialog({ initialData }: AllocationConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    defaultValues: initialData || {
      baseKeepAmount: 0,
      rules: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rules"
  });

  const rules = useWatch({
    control,
    name: "rules",
    defaultValue: []
  });

  const totalPercentage = rules.reduce((acc, rule) => acc + (Number(rule.percentage) || 0), 0);
  
  // O botão de salvar só fica habilitado se não houver regras ou se a soma for exatamente 100
  const isTotalValid = rules.length === 0 || Math.abs(totalPercentage - 100) < 0.01;

  function onSubmit(data: AllocationFormValues) {
    if (!isTotalValid) {
      toast.error('A distribuição deve fechar em exatamente 100%.');
      return;
    }

    startTransition(async () => {
      const result = await saveAllocationSettings(data.baseKeepAmount, data.rules);
      
      if (result.success) {
        toast.success('Regras de distribuição salvas com sucesso!');
        setIsOpen(false);
      } else {
        toast.error(result.error || 'Erro ao salvar regras.');
      }
    });
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open && initialData) {
      reset(initialData);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configurar Distribuição
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Regras de Distribuição de Saldo</DialogTitle>
        </DialogHeader>

        <form id="allocation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto pr-2 py-2">
          {/* Base Keep Amount */}
          <div className="space-y-2">
            <Label htmlFor="baseKeepAmount">Valor Base a Manter na Conta</Label>
            <Controller
              control={control}
              name="baseKeepAmount"
              render={({ field }) => (
                <CurrencyInput
                  id="baseKeepAmount"
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            {errors.baseKeepAmount && (
              <p className="text-sm text-destructive">{errors.baseKeepAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Este é o valor mínimo que não será distribuído para nenhuma regra.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Regras (%)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', percentage: 0 })}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Nova Regra
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20">
                Nenhuma regra cadastrada. Todo o saldo excedente ficará na conta principal.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <Controller
                        control={control}
                        name={`rules.${index}.name`}
                        render={({ field: inputField }) => (
                          <Input
                            {...inputField}
                            placeholder="Nome do objetivo (ex: Reserva)"
                            className={errors.rules?.[index]?.name ? "border-destructive" : ""}
                          />
                        )}
                      />
                      {errors.rules?.[index]?.name && (
                        <p className="text-xs text-destructive">{errors.rules[index].name.message}</p>
                      )}
                    </div>
                    
                    <div className="w-28 space-y-1">
                      <div className="relative">
                        <Controller
                          control={control}
                          name={`rules.${index}.percentage`}
                          render={({ field: inputField }) => (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={inputField.value === 0 && !inputField.value ? '' : inputField.value}
                              onChange={(e) => inputField.onChange(e.target.value ? Number(e.target.value) : 0)}
                              className={errors.rules?.[index]?.percentage ? "border-destructive pr-8" : "pr-8"}
                            />
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="flex-col sm:flex-row items-center sm:justify-between gap-4 pt-4 border-t mt-auto">
          {fields.length > 0 && (
            <div className={`text-sm font-medium ${isTotalValid ? 'text-green-500 dark:text-green-400' : 'text-destructive'}`}>
              Total: {totalPercentage.toFixed(2)}%
              {!isTotalValid && ' (Faltam/Sobram para 100%)'}
            </div>
          )}
          
          <Button 
            type="submit" 
            form="allocation-form" 
            disabled={isPending || !isTotalValid}
            className="w-full sm:w-auto"
          >
            {isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
