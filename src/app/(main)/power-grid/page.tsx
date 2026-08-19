import { getGridFilterOptions } from "@/app/actions/power-grid";
import { PowerGridClientPage } from "./power-grid-client-page";

export const metadata = {
  title: "Power Grid | Minhas Finanças",
  description: "Modo planilha avançado para edição em lote de transações",
};

export default async function PowerGridPage() {
  const filterOptions = await getGridFilterOptions();

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-8">
      <PowerGridClientPage filterOptions={filterOptions} />
    </div>
  );
}
