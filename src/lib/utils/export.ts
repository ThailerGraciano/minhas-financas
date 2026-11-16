import { format, parseISO } from "date-fns";

export interface ExportableTransaction {
  dueDate?: string;
  launchDate?: string;
  date?: string;
  description: string | null;
  amount: string | number;
  type: string;
  status: string;
  invoiceMonth?: string | null;
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
  account?: { name: string } | null;
  creditCard?: { name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  credit_card_expense: "Cartão de Crédito",
};

function escapeCSVField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDateBR(rawDate: string): string {
  if (!rawDate) return "";
  try {
    return format(parseISO(rawDate), "dd/MM/yyyy");
  } catch {
    return rawDate;
  }
}

function formatAmountBR(amount: string | number, type: string): string {
  const numeric = Number(amount || 0);
  const isExpense = type === "expense" || type === "credit_card_expense";
  const value = isExpense ? -Math.abs(numeric) : Math.abs(numeric);
  return escapeCSVField(
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
}

function formatStatusLabel(status: string): string {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  return status;
}

function downloadCSV(header: string[], rows: string[], filename: string) {
  const csvContent = [header.join(","), ...rows].join("\n");
  const csvWithBOM = "\uFEFF" + csvContent;
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCSV(
  transactions: ExportableTransaction[],
  invoiceMonth: string,
  cardName: string,
) {
  const header = [
    '"Vencimento"',
    '"Lançamento"',
    '"Descrição"',
    '"Categoria"',
    '"Subcategoria"',
    '"Valor"',
    '"Status"',
  ];

  const rows = transactions.map((t) => {
    const rawDue = t.dueDate || t.date || "";
    const rawLaunch = t.launchDate || rawDue;

    return [
      formatDateBR(rawDue),
      formatDateBR(rawLaunch),
      escapeCSVField(t.description || ""),
      escapeCSVField(t.category?.name || ""),
      escapeCSVField(t.subcategory?.name || ""),
      formatAmountBR(t.amount, t.type),
      escapeCSVField(formatStatusLabel(t.status)),
    ].join(",");
  });

  const filename = `fatura-${cardName.toLowerCase().replace(/\s+/g, "-")}-${invoiceMonth}.csv`;
  downloadCSV(header, rows, filename);
}

export function exportPowerGridToCSV(transactions: ExportableTransaction[]) {
  const header = [
    '"Vencimento"',
    '"Lançamento"',
    '"Tipo"',
    '"Descrição"',
    '"Categoria"',
    '"Subcategoria"',
    '"Conta / Cartão"',
    '"Fatura"',
    '"Valor"',
    '"Status"',
  ];

  const rows = transactions.map((t) => {
    const rawDue = t.dueDate || t.date || "";
    const rawLaunch = t.launchDate || rawDue;
    const origin = t.creditCard?.name || t.account?.name || "";

    return [
      formatDateBR(rawDue),
      formatDateBR(rawLaunch),
      escapeCSVField(TYPE_LABELS[t.type] || t.type),
      escapeCSVField(t.description || ""),
      escapeCSVField(t.category?.name || ""),
      escapeCSVField(t.subcategory?.name || ""),
      escapeCSVField(origin),
      escapeCSVField(t.invoiceMonth || ""),
      formatAmountBR(t.amount, t.type),
      escapeCSVField(formatStatusLabel(t.status)),
    ].join(",");
  });

  const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
  downloadCSV(header, rows, `power-grid-${timestamp}.csv`);
}
