import { getAccounts } from "@/app/actions/accounts";
import { getSettings } from "@/app/actions/settings";
import { getTransactions } from "@/app/actions/transactions";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { TransactionsClientPage } from "./transactions-client-page";

export const metadata = {
  title: "Transações | Minhas Finanças",
};

export default async function TransactionsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const accountIdParam = searchParams?.accountId;
  const accountId = accountIdParam ? Number(accountIdParam) : undefined;

  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);

  const initialTransactions = await getTransactions(currentMonth, accountId);
  const accounts = await getAccounts();

  return (
    <div className="container mx-auto px-0 py-2 sm:py-4 md:p-8">
      <TransactionsClientPage
        closingDay={settingsData.closingDay}
        initialTransactions={initialTransactions}
        initialAccountId={accountId}
        accounts={accounts}
      />
    </div>
  );
}
