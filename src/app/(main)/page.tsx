import { getDashboardFullData } from "@/app/actions/dashboard-full";
import { getSettings } from "@/app/actions/settings";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { DashboardClientPage } from "./dashboard-client-page";

export default async function DashboardPage() {
  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);

  const initialData = await getDashboardFullData(currentMonth);

  return (
    <div className="container mx-auto px-0 md:px-8 py-4 md:py-8">
      <DashboardClientPage closingDay={settingsData.closingDay} initialData={initialData} />
    </div>
  );
}
