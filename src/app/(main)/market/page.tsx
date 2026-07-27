import { getSettings } from '@/app/actions/settings';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';
import { getMarketFullData } from '@/app/actions/market-full';
import { MarketClientPage } from './market-client-page';

export const metadata = {
  title: 'Mercado | Minhas Finanças',
};

export default async function MarketPage() {
  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);

  const initialData = await getMarketFullData(currentMonth);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <MarketClientPage 
        closingDay={settingsData.closingDay}
        initialData={initialData}
      />
    </div>
  );
}
