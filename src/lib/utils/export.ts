import { format, parseISO } from "date-fns";

export function exportTransactionsToCSV(
  transactions: {
    dueDate?: string;
    launchDate?: string;
    date?: string;
    description: string | null;
    amount: string | number;
    type: string;
    status: string;
    category?: { name: string } | null;
    subcategory?: { name: string } | null;
  }[],
  invoiceMonth: string,
  cardName: string,
) {
  // Cabeçalho do CSV
  const header = [
    '"Vencimento"',
    '"Lançamento"',
    '"Descrição"',
    '"Categoria"',
    '"Subcategoria"',
    '"Valor"',
    '"Status"',
  ].join(",");

  // Linhas do CSV
  const rows = transactions.map((t) => {
    // Formatar Datas (DD/MM/YYYY)
    const rawDue = (t as { dueDate?: string; date?: string }).dueDate || (t as { date?: string }).date || "";
    const rawLaunch = (t as { launchDate?: string }).launchDate || rawDue;
    let formattedDueDate = "";
    let formattedLaunchDate = "";
    try {
      formattedDueDate = rawDue ? format(parseISO(rawDue), "dd/MM/yyyy") : "";
    } catch {
      formattedDueDate = rawDue;
    }
    try {
      formattedLaunchDate = rawLaunch ? format(parseISO(rawLaunch), "dd/MM/yyyy") : "";
    } catch {
      formattedLaunchDate = rawLaunch;
    }

    // Escapar aspas na descrição e colocar entre aspas
    const description = `"${(t.description || "").replace(/"/g, '""')}"`;

    // Categoria e Subcategoria
    const category = `"${t.category?.name || ""}"`;
    const subcategory = `"${t.subcategory?.name || ""}"`;

    // Formatar Valor (garantindo negativo para despesas)
    const amount = Number(t.amount || 0);
    const isExpense = t.type === "expense" || t.type === "credit_card_expense";
    const value = isExpense ? -Math.abs(amount) : Math.abs(amount);

    // Formato brasileiro: 1.234,56
    const formattedValue = `"${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}"`;

    // Traduzir Status
    let statusText = t.status;
    if (t.status === "paid") statusText = "Pago";
    if (t.status === "pending") statusText = "Pendente";
    const status = `"${statusText}"`;

    return [formattedDueDate, formattedLaunchDate, description, category, subcategory, formattedValue, status].join(
      ",",
    );
  });

  // Unir cabeçalho e linhas
  const csvContent = [header, ...rows].join("\n");

  // Adicionar BOM (Byte Order Mark) para o Excel reconhecer UTF-8 (acentos, etc)
  const csvWithBOM = "\uFEFF" + csvContent;

  // Criar Blob
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });

  // Criar link temporário e disparar download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `fatura-${cardName.toLowerCase().replace(/\s+/g, "-")}-${invoiceMonth}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
