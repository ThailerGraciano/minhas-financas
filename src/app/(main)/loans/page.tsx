import { getLoansPageData } from "@/app/actions/loans";
import { LoansClientPage } from "./loans-client-page";

export default async function LoansPage() {
  const data = await getLoansPageData();

  return (
    <div className="container mx-auto px-0 py-4 md:p-8 space-y-6 max-w-6xl">
      <LoansClientPage data={data} />
    </div>
  );
}

