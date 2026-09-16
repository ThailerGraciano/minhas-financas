"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import { createLoan } from "@/app/actions/loans";
import { getTransactionFormData } from "@/app/actions/form-data";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;

const loanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['bank', 'personal']),
  date: z.string().min(1, "Data é obrigatória"),
  totalAmount: z.number().min(0.01, "Valor deve ser maior que zero"),
  installments: z.number().min(1, "Mínimo 1 parcela"),
  interestRate: z.number().min(0, "Taxa não pode ser negativa"),
  installmentAmount: z.number().optional(),
  alreadyReceived: z.boolean(),
  
  // Bank fields
  categoryId: z.string().optional(),
  bankIncomeAccountId: z.string().optional(),
  bankPaymentMethod: z.enum(['account', 'credit_card']).optional(),
  bankExpenseAccountId: z.string().optional(),
  bankCreditCardId: z.string().optional(),
  firstInvoiceMonth: z.string().optional(),

  // Personal fields
  reserveAccountId: z.string().optional(),
  checkingAccountId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'bank') {
    if (!data.categoryId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryId"], message: "Obrigatório" });
    if (!data.alreadyReceived && !data.bankIncomeAccountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankIncomeAccountId"], message: "Obrigatório" });
    }
    
    if (data.bankPaymentMethod === 'account' && !data.bankExpenseAccountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankExpenseAccountId"], message: "Obrigatório" });
    }
    if (data.bankPaymentMethod === 'credit_card') {
      if (!data.bankCreditCardId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankCreditCardId"], message: "Obrigatório" });
      if (!data.firstInvoiceMonth) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["firstInvoiceMonth"], message: "Obrigatório" });
    }
  } else {
    if (!data.reserveAccountId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reserveAccountId"], message: "Obrigatório" });
    if (!data.checkingAccountId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkingAccountId"], message: "Obrigatório" });
  }
});

type LoanFormValues = z.infer<typeof loanSchema>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function LoanFormDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open && !formDataCache) {
      getTransactionFormData().then(setFormDataCache);
    }
  }, [open, formDataCache]);

  const { register, handleSubmit, watch, setValue, getValues, control, reset, formState: { errors } } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: 'bank',
      date: format(new Date(), 'yyyy-MM-dd'),
      totalAmount: 0,
      interestRate: 0,
      installments: 1,
      installmentAmount: 0,
      alreadyReceived: false,
      bankPaymentMethod: 'account',
    }
  });

  const selectedType = watch('type');
  const bankPaymentMethod = watch('bankPaymentMethod');
  const watchedAmount = watch('totalAmount') || 0;
  const watchedInstallments = watch('installments') || 1;
  const watchedRate = watch('interestRate') || 0;
  const watchedInstallmentAmount = watch('installmentAmount') || 0;
  const watchedAlreadyReceived = watch('alreadyReceived');

  const effectiveInstallment = watchedInstallmentAmount > 0 
    ? watchedInstallmentAmount 
    : (watchedInstallments > 0 ? (watchedAmount / watchedInstallments) * (1 + (watchedRate / 100)) : 0);

  const totalToPay = effectiveInstallment * (watchedInstallments || 1);
  const totalInterest = Math.max(0, totalToPay - watchedAmount);

  const categories = useMemo(() => {
    if (!formDataCache?.categories) return [];
    const targetType = watchedAlreadyReceived ? 'expense' : 'income';
    const filtered = formDataCache.categories.filter((c) => c.type === targetType);
    return filtered.length > 0 ? filtered : formDataCache.categories.filter((c) => c.type !== 'transfer');
  }, [formDataCache, watchedAlreadyReceived]);

  useEffect(() => {
    const currentCatId = getValues('categoryId');
    if (currentCatId && categories.length > 0) {
      const exists = categories.some((c) => c.id.toString() === currentCatId);
      if (!exists) {
        setValue('categoryId', '');
      }
    }
  }, [watchedAlreadyReceived, categories, getValues, setValue]);

  const onSubmit = async (data: LoanFormValues) => {
    setIsPending(true);
    try {
      await createLoan({
        name: data.name,
        type: data.type,
        date: data.date,
        totalAmount: data.totalAmount,
        installments: data.installments,
        interestRate: data.interestRate,
        alreadyReceived: data.alreadyReceived,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        bankIncomeAccountId: data.bankIncomeAccountId ? Number(data.bankIncomeAccountId) : undefined,
        bankExpenseAccountId: data.bankExpenseAccountId ? Number(data.bankExpenseAccountId) : undefined,
        bankCreditCardId: data.bankCreditCardId ? Number(data.bankCreditCardId) : undefined,
        firstInvoiceMonth: data.firstInvoiceMonth,
        reserveAccountId: data.reserveAccountId ? Number(data.reserveAccountId) : undefined,
        checkingAccountId: data.checkingAccountId ? Number(data.checkingAccountId) : undefined,
      });
      toast.success("Empréstimo criado com sucesso!");
      reset();
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao criar empréstimo");
    } finally {
      setIsPending(false);
    }
  };

  const invoiceOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = addMonths(new Date(), i - 1);
    const label = format(d, "MMMM/yyyy", { locale: ptBR });
    return {
      value: format(d, "yyyy-MM"),
      label: label.charAt(0).toUpperCase() + label.slice(1)
    };
  });

  const accounts = formDataCache?.accounts || [];
  const creditCards = formDataCache?.creditCards || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Novo Empréstimo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Novo Empréstimo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <Tabs 
            value={selectedType} 
            onValueChange={(val) => setValue('type', val as 'bank' | 'personal')} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bank">Financeira</TabsTrigger>
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Nome/Descrição</Label>
            <Input {...register("name")} placeholder="Ex: Empréstimo NuBank" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Data (Concessão)</Label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Pego (R$)</Label>
              <Controller
                name="totalAmount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput 
                    name={field.name}
                    value={field.value}
                    onValueChange={(val) => {
                      const num = val ? Number(val) : 0;
                      field.onChange(num);
                      const instCount = getValues('installments') || 1;
                      const rate = getValues('interestRate') || 0;
                      if (instCount > 0 && num > 0) {
                        const base = num / instCount;
                        const instVal = rate > 0 ? base * (1 + rate / 100) : base;
                        setValue('installmentAmount', Math.round(instVal * 100) / 100);
                      } else {
                        setValue('installmentAmount', 0);
                      }
                    }}
                  />
                )}
              />
              {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Controller
                name="installments"
                control={control}
                render={({ field }) => (
                  <Input 
                    type="number" 
                    min="1" 
                    name={field.name}
                    value={field.value ?? 1}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 0;
                      field.onChange(count);
                      const amount = getValues('totalAmount') || 0;
                      const rate = getValues('interestRate') || 0;
                      if (count > 0 && amount > 0) {
                        const base = amount / count;
                        const instVal = rate > 0 ? base * (1 + rate / 100) : base;
                        setValue('installmentAmount', Math.round(instVal * 100) / 100);
                      }
                    }}
                  />
                )}
              />
              {errors.installments && <p className="text-sm text-destructive">{errors.installments.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taxa de Juros (%)</Label>
              <Controller
                name="interestRate"
                control={control}
                render={({ field }) => (
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name={field.name}
                    value={field.value ?? 0}
                    placeholder="0.00"
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      field.onChange(rate);
                      const amount = getValues('totalAmount') || 0;
                      const count = getValues('installments') || 1;
                      if (count > 0 && amount > 0) {
                        const base = amount / count;
                        const instVal = rate > 0 ? base * (1 + rate / 100) : base;
                        setValue('installmentAmount', Math.round(instVal * 100) / 100);
                      }
                    }}
                  />
                )}
              />
              {errors.interestRate && <p className="text-sm text-destructive">{errors.interestRate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Valor da Parcela (R$)</Label>
              <Controller
                name="installmentAmount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput 
                    name={field.name}
                    value={field.value}
                    onValueChange={(val) => {
                      const instVal = val ? Number(val) : 0;
                      field.onChange(instVal);
                      const amount = getValues('totalAmount') || 0;
                      const count = getValues('installments') || 1;
                      if (amount > 0 && count > 0) {
                        const base = amount / count;
                        const rate = base > 0 ? Math.max(0, ((instVal / base) - 1) * 100) : 0;
                        setValue('interestRate', Number(rate.toFixed(2)));
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Resumo do cálculo dinâmico */}
          {watchedAmount > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2 text-sm">
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Valor Total a Pagar:</span>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(totalToPay)}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Composição:</span>
                <span>{watchedInstallments}x de {formatCurrency(effectiveInstallment)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total em Juros:</span>
                <span className={totalInterest > 0 ? "font-semibold text-amber-500" : "text-muted-foreground"}>
                  {totalInterest > 0 
                    ? `+ ${formatCurrency(totalInterest)} (${watchedRate.toFixed(2)}% a.m.)` 
                    : "R$ 0,00 (Sem juros)"}
                </span>
              </div>
            </div>
          )}

          {/* Switch de valor já recebido */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-xs">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="already-received" className="text-sm font-medium cursor-pointer">
                Valor já foi recebido?
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedType === 'bank'
                  ? "Não cria transação de receita (apenas as parcelas a pagar)."
                  : "Não transfere os fundos agora (apenas as parcelas de devolução)."}
              </p>
            </div>
            <Controller
              name="alreadyReceived"
              control={control}
              render={({ field }) => (
                <Switch
                  id="already-received"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {selectedType === 'bank' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>
                  {watchedAlreadyReceived ? "Categoria da Despesa (Parcelas)" : "Categoria (Receita)"}
                </Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
              </div>

              {!watchedAlreadyReceived && (
                <div className="space-y-2">
                  <Label>Conta Destino (Onde cai o dinheiro)</Label>
                  <Controller
                    name="bankIncomeAccountId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankIncomeAccountId && <p className="text-sm text-destructive">{errors.bankIncomeAccountId.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>Método de Pagamento das Parcelas</Label>
                <Controller
                  name="bankPaymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Conta Bancária</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {bankPaymentMethod === 'account' ? (
                <div className="space-y-2">
                  <Label>Conta de Pagamento (Saída)</Label>
                  <Controller
                    name="bankExpenseAccountId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankExpenseAccountId && <p className="text-sm text-destructive">{errors.bankExpenseAccountId.message}</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Cartão de Crédito</Label>
                    <Controller
                      name="bankCreditCardId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cartão" />
                          </SelectTrigger>
                          <SelectContent>
                            {creditCards.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.bankCreditCardId && <p className="text-sm text-destructive">{errors.bankCreditCardId.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Fatura Inicial</Label>
                    <Controller
                      name="firstInvoiceMonth"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a fatura" />
                          </SelectTrigger>
                          <SelectContent>
                            {invoiceOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.firstInvoiceMonth && <p className="text-sm text-destructive">{errors.firstInvoiceMonth.message}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {selectedType === 'personal' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>
                  {watchedAlreadyReceived
                    ? "Conta da Reserva (Que receberá as devoluções)"
                    : "Conta de Origem (Ex: Reserva)"}
                </Label>
                <Controller
                  name="reserveAccountId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={watchedAlreadyReceived ? "Conta que receberá o retorno" : "De onde sai o dinheiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.reserveAccountId && <p className="text-sm text-destructive">{errors.reserveAccountId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  {watchedAlreadyReceived
                    ? "Conta Pagadora (De onde sairão as devoluções)"
                    : "Conta de Destino (Ex: Corrente)"}
                </Label>
                <Controller
                  name="checkingAccountId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={watchedAlreadyReceived ? "Conta que pagará as devoluções" : "Para onde vai"} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.checkingAccountId && <p className="text-sm text-destructive">{errors.checkingAccountId.message}</p>}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Empréstimo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
