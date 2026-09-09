const fs = require('fs');
const file = 'src/components/edit-transaction-dialog.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const [originalAmount, setOriginalAmount] = useState<number>(0);\\n',
  ''
);
content = content.replace(
  '      setOriginalAmount(Number(transaction.amount));\\n',
  ''
);

fs.writeFileSync(file, content);
console.log("Removed originalAmount state.");
