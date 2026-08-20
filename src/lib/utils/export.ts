import { format, parseISO } from "date-fns";

export function exportTransactionsToCSV(transactions: any[], invoiceMonth: string, cardName: string) {
  // Cabeçalho do CSV
  const header = ['"Data"', '"Descrição"', '"Categoria"', '"Subcategoria"', '"Valor"', '"Status"'].join(",");

  // Linhas do CSV
  const rows = transactions.map((t) => {
    // Formatar Data (DD/MM/YYYY)
    let formattedDate = "";
    try {
      formattedDate = format(parseISO(t.date), "dd/MM/yyyy");
    } catch (e) {
      // Fallback em caso de erro no parseISO
      formattedDate = t.date ? new Date(t.date).toLocaleDateString("pt-BR") : "";
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

    return [formattedDate, description, category, subcategory, formattedValue, status].join(",");
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
  link.setAttribute("download", `fatura-${cardName.toLowerCase().replace(/\s+/g, '-')}-${invoiceMonth}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
