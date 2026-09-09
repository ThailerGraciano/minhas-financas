const fs = require('fs');
const file = 'src/components/edit-transaction-dialog.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [originalAmount, setOriginalAmount] = useState<number>(0);',
  'const [description, setDescription] = useState("");\n  const [date, setDate] = useState("");\n  const [originalAmount, setOriginalAmount] = useState<number>(0);'
);

content = content.replace(
  'setSelectedSubcategoryId(transaction.subcategoryId ? String(transaction.subcategoryId) : "");',
  'setSelectedSubcategoryId(transaction.subcategoryId ? String(transaction.subcategoryId) : "");\n      setDescription(transaction.description);\n      setDate(transaction.date.substring(0, 10));'
);

const hasChangesLogic = `
  const hasChanges = useMemo(() => {
    if (!transaction || !fullTransaction) return false;
    const origDesc = transaction.description;
    const origDate = transaction.date.substring(0, 10);
    const origAmount = Number(transaction.amount);
    const origCat = transaction.categoryId ? String(transaction.categoryId) : "";
    const origSubCat = transaction.subcategoryId ? String(transaction.subcategoryId) : "";
    const origAcc = fullTransaction.accountId ? String(fullTransaction.accountId) :
             fullTransaction.creditCardId ? \`cc-\${fullTransaction.creditCardId}\` : "";
    const origDestAcc = fullTransaction.destinationAccountId ? String(fullTransaction.destinationAccountId) : "";

    return (
      description !== origDesc ||
      date !== origDate ||
      amount !== origAmount ||
      selectedCategoryId !== origCat ||
      selectedSubcategoryId !== origSubCat ||
      selectedAccountId !== origAcc ||
      selectedDestinationAccountId !== origDestAcc
    );
  }, [description, date, amount, selectedCategoryId, selectedSubcategoryId, selectedAccountId, selectedDestinationAccountId, transaction, fullTransaction]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {`;

content = content.replace(
  'const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {',
  hasChangesLogic
);

content = content.replace(
  '<Input id="description" name="description" defaultValue={transaction.description} required />',
  '<Input id="description" name="description" value={description} onChange={e => setDescription(e.target.value)} required />'
);

content = content.replace(
  '<DatePicker id="date" name="date" defaultValue={transaction.date.substring(0, 10)} required />',
  '<DatePicker id="date" name="date" value={date} onChange={setDate} required />'
);

const originalMessage = `{(fullTransaction?.installmentTotal || fullTransaction?.fixedTransactionId) && amount !== originalAmount ? (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-0.5">
                  <Label className="text-sm cursor-pointer" onClick={() => setUpdateFuture(!updateFuture)}>
                    Alterar o valor das próximas também?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {fullTransaction.fixedTransactionId
                      ? "O novo valor será aplicado a todas as ocorrências futuras."
                      : "O novo valor será aplicado a todas as parcelas seguintes."}
                  </p>
                </div>
                <Switch checked={updateFuture} onCheckedChange={setUpdateFuture} />
              </div>
            ) : null}`;

const newMessage = `{(fullTransaction?.installmentTotal || fullTransaction?.fixedTransactionId) && hasChanges ? (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-0.5">
                  <Label className="text-sm cursor-pointer" onClick={() => setUpdateFuture(!updateFuture)}>
                    Aplicar alterações às próximas também?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {fullTransaction.fixedTransactionId
                      ? "As modificações serão refletidas em todas as ocorrências futuras."
                      : "As modificações serão refletidas em todas as parcelas seguintes."}
                  </p>
                </div>
                <Switch checked={updateFuture} onCheckedChange={setUpdateFuture} />
              </div>
            ) : null}`;

content = content.replace(originalMessage, newMessage);

fs.writeFileSync(file, content);
console.log("File patched.");
