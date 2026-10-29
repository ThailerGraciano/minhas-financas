"use client";

import { getTransactionFormData } from "@/app/actions/form-data";
import { createTransaction } from "@/app/actions/transactions";
import { QuickCategoryDialog } from "@/components/quick-category-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Switch } from "@/components/ui/switch";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
type Tab = "expense" | "income" | "transfer";
type Category = FormData["categories"][number];
type Account = FormData["accounts"][number];
type Card = FormData["creditCards"][number];

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const today = () => format(new Date(), "yyyy-MM-dd");

export interface TransactionFormDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  initialTab?: Tab;
}

export function TransactionFormDialog({
  trigger,
  onSuccess,
  initialTab = "expense",
}: TransactionFormDialogProps = {}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [amount, setAmount] = useState<number | undefined>();
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [dueEdited, setDueEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [payment, setPayment] = useState<"account" | "credit_card">("account");
  const [accountId, setAccountId] = useState("");
  const [incomeAccountId, setIncomeAccountId] = useState("");
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [cardId, setCardId] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");
  const [kind, setKind] = useState<"single" | "fixed" | "installment">("single");
  const [installment, setInstallment] = useState("1");
  const [totalInstallments, setTotalInstallments] = useState("2");
  const [isTotalAmount, setIsTotalAmount] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [pending, setPending] = useState(false);
  const [closedInvoice, setClosedInvoice] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (open && !data) getTransactionFormData().then(setData);
  }, [open, data]);

  const categories = useMemo(
    () => data?.categories.filter((item: Category) => item.type === (tab === "income" ? "income" : "expense")) ?? [],
    [data, tab],
  );
  const selectedCategory = categories.find((item: Category) => item.id === Number(categoryId));
  const subcategories = selectedCategory?.subcategories ?? [];
  const card = data?.creditCards.find((item: Card) => item.id === Number(cardId));
  const invoiceOptions = useMemo(() => {
    if (!card) return [];
    const date = parseISO(launchDate);
    const defaultMonth = date.getDate() >= card.closingDay ? addMonths(date, 1) : date;
    const base = new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1);
    return [0, 1, 2, 3].map((offset) => addMonths(base, offset));
  }, [card, launchDate]);
  const effectiveDueDate =
    payment === "credit_card" && card && invoiceMonth
      ? `${invoiceMonth}-${String(card.dueDay).padStart(2, "0")}`
      : dueEdited
        ? dueDate
        : launchDate;
  const canShowStatus = (tab === "income" || payment === "account") && effectiveDueDate <= today();
  const monthlyAmount = amount ? (isTotalAmount ? amount / Math.max(Number(totalInstallments), 1) : amount) : 0;

  const reset = (nextTab = tab) => {
    setTab(nextTab);
    setAmount(undefined);
    setDescription("");
    setLaunchDate(today());
    setDueDate(today());
    setDueEdited(false);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setIncomeAccountId("");
    setOriginId("");
    setDestinationId("");
    setCardId("");
    setInvoiceMonth("");
    setKind("single");
    setInstallment("1");
    setTotalInstallments("2");
    setIsTotalAmount(true);
    setIsPaid(true);
  };
  const changeTab = (next: Tab) => {
    setTab(next);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setCardId("");
    setInvoiceMonth("");
  };
  const chooseCategory = (value: string) => {
    setCategoryId(value);
    const first = data?.categories.find((item: Category) => item.id === Number(value))?.subcategories?.[0];
    setSubcategoryId(first ? String(first.id) : "");
  };
  const handleCard = (value: string) => {
    setCardId(value);
    const next = data?.creditCards.find((item: Card) => item.id === Number(value));
    if (next) {
      const date = parseISO(launchDate);
      const month = date.getDate() >= next.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
  };
  const handleLaunchDate = (value: string) => {
    setLaunchDate(value);
    if (!dueEdited && payment !== "credit_card") setDueDate(value);
  };

  const save = async (close: boolean, confirmed = false) => {
    if (!amount || !description.trim()) return toast.error("Informe descrição e valor.");
    if (tab !== "transfer" && !categoryId) return toast.error("Selecione uma categoria.");
    if (tab === "transfer" && (!originId || !destinationId || originId === destinationId))
      return toast.error("Escolha contas diferentes.");
    if (tab === "expense" && payment === "account" && !accountId) return toast.error("Selecione a conta.");
    if (tab === "expense" && payment === "credit_card" && (!cardId || !invoiceMonth))
      return toast.error("Selecione cartão e fatura.");
    if (tab === "income" && !incomeAccountId) return toast.error("Selecione a conta de destino.");
    if (tab === "expense" && payment === "credit_card" && card && !confirmed) {
      const closeDate = `${invoiceMonth}-${String(card.closingDay).padStart(2, "0")}`;
      if (closeDate <= today()) {
        setCloseAfterSave(close);
        return setClosedInvoice(true);
      }
    }
    setPending(true);
    const result = await createTransaction({
      description,
      amount: String(amount),
      dueDate: effectiveDueDate,
      launchDate,
      competencyMonth: effectiveDueDate.slice(0, 7),
      categoryId: categoryId ? Number(categoryId) : undefined,
      subcategoryId: subcategoryId ? Number(subcategoryId) : undefined,
      status: isPaid && effectiveDueDate <= today() ? "paid" : "pending",
      type: tab === "expense" ? (payment === "credit_card" ? "credit_card_expense" : "expense") : tab,
      accountId:
        tab === "expense"
          ? payment === "account"
            ? Number(accountId)
            : undefined
          : tab === "income"
            ? Number(incomeAccountId)
            : Number(originId),
      creditCardId: tab === "expense" && payment === "credit_card" ? Number(cardId) : undefined,
      invoiceMonth: payment === "credit_card" ? invoiceMonth : undefined,
      isFixed: kind === "fixed",
      installmentTotal: kind === "installment" ? Number(totalInstallments) : undefined,
      current_installment: kind === "installment" ? Number(installment) : undefined,
      isTotalAmount: kind === "installment" ? isTotalAmount : undefined,
      destinationAccountId: tab === "transfer" ? Number(destinationId) : undefined,
    });
    setPending(false);
    if (!result.success) return toast.error(result.error || "Não foi possível salvar.");
    toast.success("Transação salva com sucesso!");
    if (close) {
      setOpen(false);
      reset(initialTab);
    } else reset(tab);
    onSuccess?.();
    router.refresh();
  };

  const tabLabel = tab === "expense" ? "Despesa" : tab === "income" ? "Receita" : "Transferência";
  const accent = tab === "expense" ? "text-rose-400" : tab === "income" ? "text-emerald-400" : "text-blue-400";
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) setTab(initialTab);
        }}
      >
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden gap-0 p-0 bg-[#1A1A22] border-white/5 rounded-t-3xl sm:rounded-2xl text-white">
          <DialogHeader className="shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-white/5">
            <DialogTitle className="sr-only">Nova transação</DialogTitle>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Novo lançamento</span>
              <span className={`text-xs font-semibold ${accent}`}>{tabLabel}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-3xl font-bold tabular-nums ${accent}`}>R$</span>
                <CurrencyInput
                  name="amount"
                  value={amount}
                  onValueChange={setAmount}
                  className="h-12 min-w-0 text-3xl sm:text-4xl font-bold tabular-nums bg-transparent border-0 p-0 focus-visible:ring-0"
                  placeholder="0,00"
                />
              </div>
              {canShowStatus && (
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-medium ${isPaid ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}
                >
                  {isPaid ? (
                    <CheckCircle2 className="mr-1 inline size-3.5" />
                  ) : (
                    <Clock className="mr-1 inline size-3.5" />
                  )}
                  {isPaid ? (tab === "income" ? "Recebido" : "Pago") : "Pendente"}
                </button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-[#121217] p-1">
              {(["expense", "income", "transfer"] as Tab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeTab(item)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${tab === item ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}
                >
                  <span
                    className={`size-2 rounded-full ${item === "expense" ? "bg-rose-500" : item === "income" ? "bg-emerald-500" : "bg-blue-500"}`}
                  />
                  {item === "expense" ? "Despesa" : item === "income" ? "Receita" : "Transferência"}
                </button>
              ))}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col gap-5">
              <div>
                <Label className="text-xs text-white/50">Descrição</Label>
                <div className="relative mt-2">
                  <ReceiptText className="absolute left-3 top-3.5 size-4 text-white/35" />
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      tab === "expense" ? "Ex: Supermercado" : tab === "income" ? "Ex: Salário" : "Ex: PIX entre contas"
                    }
                    className="h-11 pl-10 bg-[#121217] border-white/10 focus-visible:ring-[#FF6B00]"
                  />
                </div>
              </div>
              {tab !== "transfer" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Categoria">
                    <div className="flex items-center gap-2">
                      <Select value={categoryId} onValueChange={chooseCategory}>
                        <SelectTrigger className="w-full flex-1 !h-12 rounded-xl px-3.5 bg-[#121217] border-white/10">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item: Category) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <QuickCategoryDialog
                        type={tab === "income" ? "income" : "expense"}
                        onSuccess={async (id, sub) => {
                          const nextData = await getTransactionFormData();
                          setData(nextData);
                          setCategoryId(id);
                          setSubcategoryId(sub);
                        }}
                      />
                    </div>
                  </Field>
                  <Field label="Subcategoria">
                    <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                      <SelectTrigger className="w-full !h-12 rounded-xl px-3.5 bg-[#121217] border-white/10">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Conta de origem (Sai)">
                    <AccountSelect value={originId} onChange={setOriginId} accounts={data?.accounts ?? []} />
                  </Field>
                  <Field label="Conta de destino (Entra)">
                    <AccountSelect value={destinationId} onChange={setDestinationId} accounts={data?.accounts ?? []} />
                  </Field>
                </div>
              )}
              {tab === "expense" && (
                <>
                  <div>
                    <Label className="text-xs text-white/50">Destino / forma de pagamento</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <SelectableCard
                        icon={<Landmark />}
                        title="Conta"
                        subtitle="Saldo à vista"
                        selected={payment === "account"}
                        onClick={() => setPayment("account")}
                      />
                      <SelectableCard
                        icon={<CreditCard />}
                        title="Crédito"
                        subtitle="Fatura do cartão"
                        selected={payment === "credit_card"}
                        onClick={() => setPayment("credit_card")}
                      />
                    </div>
                  </div>
                  {payment === "account" ? (
                    <Field label="Selecione a conta">
                      <AccountSelect value={accountId} onChange={setAccountId} accounts={data?.accounts ?? []} />
                    </Field>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Field
                        label={
                          <span className="flex justify-between">
                            Cartão de crédito{" "}
                            {card && (
                              <em className="not-italic text-emerald-400">Limite: {money(Number(card.creditLimit))}</em>
                            )}
                          </span>
                        }
                      >
                        <Select value={cardId} onValueChange={handleCard}>
                          <SelectTrigger className="w-full !h-12 rounded-xl px-3.5 bg-[#121217] border-white/10">
                            <SelectValue placeholder="Selecionar cartão" />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.creditCards.map((item: Card) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      {card && (
                        <div>
                          <div className="flex justify-between text-xs text-white/50 mb-2">
                            <span>Fatura</span>
                            <span>Fecha dia {card.closingDay}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {invoiceOptions.map((month) => {
                              const value = format(month, "yyyy-MM");
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setInvoiceMonth(value)}
                                  className={`flex flex-col items-center justify-center rounded-xl border px-3.5 py-3 text-sm font-semibold capitalize transition ${invoiceMonth === value ? "border-[#FF6B00] bg-[#FF6B00]/15 text-white shadow-sm" : "border-white/10 bg-[#121217] text-white/70 hover:border-white/20 hover:text-white"}`}
                                >
                                  <span>{format(month, "MMM/yy", { locale: ptBR })}</span>
                                  <span className="mt-1 block text-xs font-normal normal-case text-white/45">
                                    Vence dia {card.dueDay}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {tab === "income" && (
                <Field label="Depositar na conta">
                  <AccountSelect
                    value={incomeAccountId}
                    onChange={setIncomeAccountId}
                    accounts={data?.accounts ?? []}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de lançamento">
                  <DatePicker value={launchDate} onChange={handleLaunchDate} />
                </Field>
                <Field label="Data de vencimento">
                  <DatePicker
                    value={effectiveDueDate}
                    onChange={(value) => {
                      setDueDate(value);
                      setDueEdited(true);
                      setIsPaid(value <= today());
                    }}
                    disabled={payment === "credit_card"}
                  />
                </Field>
              </div>
              <div>
                <Label className="text-xs text-white/50">Recorrência</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <SelectableCard
                    icon={<Zap />}
                    title="Única"
                    subtitle="Sem repetição"
                    selected={kind === "single"}
                    onClick={() => setKind("single")}
                  />
                  <SelectableCard
                    icon={<RefreshCw />}
                    title="Fixa"
                    subtitle="Mensal · 12x"
                    selected={kind === "fixed"}
                    onClick={() => setKind("fixed")}
                  />
                  <SelectableCard
                    icon={<Calendar />}
                    title="Parcelada"
                    subtitle="Dividir valor"
                    selected={kind === "installment"}
                    onClick={() => setKind("installment")}
                  />
                </div>
              </div>
              {kind === "installment" && (
                <div className="rounded-xl border border-white/10 bg-[#121217] p-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Parcela inicial">
                      <Input
                        type="number"
                        min={1}
                        value={installment}
                        onChange={(e) => setInstallment(e.target.value)}
                        className="bg-[#1A1A22] border-white/10"
                      />
                    </Field>
                    <Field label="Total de parcelas">
                      <Input
                        type="number"
                        min={2}
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        className="bg-[#1A1A22] border-white/10"
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs text-white/70">O valor digitado é o total da compra?</Label>
                    <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                  </div>
                  <p className="text-xs text-white/45">
                    Serão geradas {totalInstallments} parcelas de {money(monthlyAmount)} (residual ajustado na última).
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t border-white/5 bg-[#1A1A22] px-4 sm:px-6 py-3">
            <div className="mb-3 flex items-center gap-2 text-xs text-white/55 truncate">
              <span
                className={`size-2 rounded-full ${tab === "expense" ? "bg-rose-500" : tab === "income" ? "bg-emerald-500" : "bg-blue-500"}`}
              />
              {tabLabel}{" "}
              {kind === "installment"
                ? `Parcelada (${installment}/${totalInstallments})`
                : kind === "fixed"
                  ? "Fixa"
                  : "Única"}{" "}
              <span>•</span>
              {money(kind === "installment" ? monthlyAmount : amount || 0)}
              {kind === "installment" ? "/mês" : ""}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => save(false)}
                className="border-white/10 bg-white/5 hover:bg-white/10"
              >
                <Plus data-icon="inline-start" />
                Adicionar outra
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
                className="bg-[#FF6B00] text-white hover:brightness-110"
              >
                {pending ? (
                  "Salvando..."
                ) : (
                  <>
                    <Check data-icon="inline-start" />
                    Finalizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={closedInvoice} onOpenChange={setClosedInvoice}>
        <AlertDialogContent className="bg-[#1A1A22] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Fatura já fechada</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Deseja lançar mesmo assim? O lançamento será associado à fatura selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setClosedInvoice(false);
                save(closeAfterSave, true);
              }}
              className="bg-[#FF6B00]"
            >
              Lançar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-white/50">{label}</Label>
      {children}
    </div>
  );
}
function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full !h-12 rounded-xl px-3.5 bg-[#121217] border-white/10">
        <SelectValue placeholder="Selecionar conta" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((item: Account) => (
          <SelectItem key={item.id} value={String(item.id)}>
            {item.name}
            {item.currentBalance != null ? (
              <span className="ml-2 text-xs text-white/40">{money(Number(item.currentBalance))}</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
