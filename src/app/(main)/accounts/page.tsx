import { getAccounts } from "@/app/actions/accounts";
import { AccountsClientPage } from "./accounts-client-page";

export const metadata = {
  title: "Contas | Minhas Finanças",
};

export default async function AccountsPage() {
  const initialAccounts = await getAccounts();

  const mappedAccounts = initialAccounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    currentBalance: acc.currentBalance,
  }));

  return (
    <div className="container mx-auto px-0 py-4 md:p-8">
      <AccountsClientPage initialAccounts={mappedAccounts} />
    </div>
  );
}
